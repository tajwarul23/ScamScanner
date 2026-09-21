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
) => {
  try {
    let data;
    if (mimeType === DOCX_MIME_TYPE) {
      const text = await convertDocxToText(buffer);
      data = await extractFromText(text);
    } else if (mimeType === "text/plain") {
      data = await extractFromText(buffer.toString("utf-8"));
    } else {
      data = await extractEvidence({
        imageBuffer: buffer,
        mimeType,
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
  const claimed = await db
    .update(cases)
    .set({ status: "finalizing" })
    .where(and(eq(cases.id, caseId), eq(cases.status, "processing")))
    .returning({ id: cases.id, context:cases.context });

  if (claimed.length === 0) return;
  try {
    const cleanResults = successFulResults.flatMap((r) => (r ? [r] : []));
    const signals = await ruleSignalEngine(cleanResults);
    const report = await finalizeCase(cleanResults, signals, claimed[0].context ?? undefined);
    // console.log("Signals", signals);
    // console.log("Result", cleanResults);
    // console.log("Final Report", report)
    await db
      .update(cases)
      .set({
        title: report.title,
        summary: report.summary,
        riskLevel: report.riskLevel,
        verifySteps: report.verifySteps,
        signals: signals,
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

  const context = formData.get("context");
  const extraContext =
    typeof context === "string" && context.trim() ? context : undefined;
  const textEvidence = formData.get("textEvidence");
  const pastedTextEvidence = typeof textEvidence === "string" && textEvidence.trim() ? textEvidence.trim() : undefined;
  if (files.length === 0 && !pastedTextEvidence) {
    return {
      success: false,
      error: "Attach at least one evidence file, or paste the text evidence.",
    };
  }

  let newCase: typeof cases.$inferSelect;
  let insertedItems: (typeof evidenceItems.$inferSelect)[];
  let evidenceSources: {
    fileName: string;
    mimeType: string;
    buffer: Buffer;
    isUpload: boolean;
  }[];
  try {
    [newCase] = await db
      .insert(cases)
      .values({
        userId: session.user.id,
        context: extraContext,
        status: "processing",
      })
      .returning();

    evidenceSources = [
      ...(await Promise.all(
        files.map(async (file) => ({
          fileName: file.name,
          mimeType: file.type,
          buffer: Buffer.from(await file.arrayBuffer()),
          isUpload: true,
        })),
      )),
      ...(pastedTextEvidence
        ? [
            {
              fileName: "Pasted text evidence",
              mimeType: "text/plain",
              buffer: Buffer.from(pastedTextEvidence, "utf-8"),
              isUpload: false,
            },
          ]
        : []),
    ];

    insertedItems = await db
      .insert(evidenceItems)
      .values(
        evidenceSources.map((source) => ({
          caseId: newCase.id,
          fileName: source.fileName,
          mimeType: source.mimeType,
          extractionStatus: "pending" as const,
        })),
      )
      .returning();
  } catch (err) {
    console.error("Failed to create case", err);
    return {
      success: false,
      error: "Failed to create case. Please try again.",
    };
  }

  insertedItems.forEach((item, i) => {
    const source = evidenceSources[i];

    after(() =>
      processExtraction(item.id, newCase.id, source.buffer, source.mimeType),
    );
    if (source.isUpload) {
      after(() => processUpload(item.id, newCase.id, source.buffer));
    }
  });

  redirect(`/case/${newCase.id}`);
};
