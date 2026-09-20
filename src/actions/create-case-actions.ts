"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cases, evidenceItems } from "@/lib/db/schema";
import { convertDocxToText } from "@/lib/pipeline/convertDocx";
import {
  extractEvidence,
  extractFromText,
} from "@/lib/pipeline/extractEvidence";
import { finalizeCase } from "@/lib/pipeline/finalizeCase";
import { ruleSignalEngine } from "@/lib/pipeline/ruleSignalEngine";
import { uploadEvidenceFile } from "@/lib/pipeline/uploadEvidence";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { after } from "next/server";

const DOCX_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

//get the evidence from (extractEvidence.ts and convertDocs.ts) and call the final layer of Ai
const processExtraction = async (
  evidenceItemId: string,
  caseId: string,
  buffer: Buffer,
  mimeType: string,
  context?: string,
) => {
  try {
    let data;
    if (mimeType === DOCX_MIME_TYPE) {
      const text = await convertDocxToText(buffer);
      data = await extractFromText(text, context);
    } else if (mimeType === "text/plain") {
      data = await extractFromText(buffer.toString("utf-8"), context);
    } else {
      data = await extractEvidence({
        imageBuffer: buffer,
        mimeType,
        text: context,
      });
    }

    await db
      .update(evidenceItems)
      .set({ extractionStatus: "success", extractedData: data })
      .where(eq(evidenceItems.id, evidenceItemId));
  } catch (err) {
    console.error("Extraction failed for evidence item", evidenceItemId, err);
    await db
      .update(evidenceItems)
      .set({
        extractionStatus: "error",
        errorMessage: err instanceof Error ? err.message : "Extraction failed",
      })
      .where(eq(evidenceItems.id, evidenceItemId));
  }
  await generateFinalResponse(caseId);
};

//call the last layer of ai
const generateFinalResponse = async (caseId: string) => {
  const items = await db.query.evidenceItems.findMany({
    where: eq(evidenceItems.caseId, caseId),
  });

  if (items.some((item) => item.extractionStatus === "pending")) return;

  const successFulResults = items
    .filter((item) => item.extractionStatus === "success" && item.extractedData)
    .map((item) => item.extractedData);

  if (successFulResults.length === 0) {
    await db
      .update(cases)
      .set({ status: "failed" })
      .where(eq(cases.id, caseId));
    return;
  }

  //atomically claim the case for finalization
  const claimed = await db.update(cases)
                          .set({status:"finalizing"})
                          .where(
                            and(
                              eq(cases.id, caseId),
                              eq(cases.status, "processing"),
                            ),
                          )
                          .returning({id: cases.id})

  if(claimed.length === 0)return;
  try {
    const cleanResults = successFulResults.flatMap((r) => (r ? [r] : []));
    const signals =  await ruleSignalEngine(cleanResults);
    const report = await finalizeCase(cleanResults, signals);
    console.log("Signals", signals);
    console.log("Result", cleanResults);
    console.log("Final Report", report)
    await db
      .update(cases)
      .set({
        title: report.title,
        summary: report.summary,
        riskLevel: report.riskLevel,
        verifySteps: report.verifySteps,
        signals:signals,
        status: "ready",
      })
      .where(eq(cases.id, caseId));
  } catch (err) {
    console.error("Failed to generate final report", err);
    await db
      .update(cases)
      .set({ status: "failed" })
      .where(eq(cases.id, caseId));
  }
};

//upload to cloudinary
const processUpload = async (
  evidenceItemId: string,
  caseId: string,
  buffer: Buffer,
) => {
  try {
    const url = await uploadEvidenceFile(buffer, {
      folder: `scam-scanner/cases/${caseId}`,
      publicId: evidenceItemId,
    });
    await db
      .update(evidenceItems)
      .set({ fileUrl: url })
      .where(eq(evidenceItems.id, evidenceItemId));
  } catch (err) {
    console.error("Cloudinary upload for evidence item", evidenceItemId, err);
  }
};

//insert the evidence item to db
export const createCaseAction = async (
  formData: FormData,
): Promise<{ success: false; error: string } | void> => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return {
      success: false,
      error: "You must be signed in to start an investigation",
    };
  }

  const files = formData
    .getAll("files")
    .filter((f): f is File => f instanceof File);

  if (files.length === 0) {
    return { success: false, error: "At least one file is required." };
  }

  const context = formData.get("context");
  const extraContext =
    typeof context === "string" && context.trim() ? context : undefined;

  let newCase: typeof cases.$inferSelect;
  let insertedItems: (typeof evidenceItems.$inferSelect)[];
  try {
    [newCase] = await db
      .insert(cases)
      .values({
        userId: session.user.id,
        context: extraContext,
        status: "processing",
      })
      .returning();

    insertedItems = await db
      .insert(evidenceItems)
      .values(
        files.map((file) => ({
          caseId: newCase.id,
          fileName: file.name,
          mimeType: file.type,
          extractionStatus: "pending" as const,
        })),
      )
      .returning();
  } catch (err) {
    console.error("Failed to create case", err);
    return { success: false, error: "Failed to create case. Please try again." };
  }

    const buffers = await Promise.all(
    files.map((file) => file.arrayBuffer().then(Buffer.from))
  );

  insertedItems.forEach((item, i) => {
    const buffer = buffers[i];
    const file = files[i];

    after(() => processExtraction(item.id, newCase.id, buffer, file.type, extraContext));
    after(() => processUpload(item.id, newCase.id, buffer));
  });

  redirect(`/case/${newCase.id}`);
};


