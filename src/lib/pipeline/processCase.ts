import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { cases, evidenceItems } from "@/lib/db/schema";
import { convertDocxToText } from "@/lib/pipeline/convertDocx";
import { extractEvidence, extractFromText } from "@/lib/pipeline/extractEvidence";
import { finalizeCase } from "@/lib/pipeline/finalizeCase";
import { ruleSignalEngine } from "@/lib/pipeline/ruleSignalEngine";

const DOCX_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

type EvidenceItem = typeof evidenceItems.$inferSelect;

//get evidence buffer from cloudinary url
const getEvidenceBuffer = async (item: EvidenceItem): Promise<Buffer> => {
  if (item.rawText !== null) {
    return Buffer.from(item.rawText, "utf-8");
  }
  if (!item.fileUrl) {
    throw new Error("Evidence item has neither rawText nor fileUrl");
  }
  const response = await fetch(item.fileUrl);
  if (!response.ok) {
    throw new Error(`Failed to download evidence file: ${response.status}`);
  }
  return Buffer.from(await response.arrayBuffer());
};

//extract evidence from the uploaded file's buffer
const processEvidenceItem = async (item: EvidenceItem) => {
  try {
    const buffer = await getEvidenceBuffer(item);
    let data;
    if (item.mimeType === DOCX_MIME_TYPE) {
      const text = await convertDocxToText(buffer);
      data = await extractFromText(text);
    } else if (item.mimeType === "text/plain") {
      data = await extractFromText(buffer.toString("utf-8"));
    } else {
      data = await extractEvidence({ imageBuffer: buffer, mimeType: item.mimeType });
    }

    await db
      .update(evidenceItems)
      .set({ extractionStatus: "success", extractedData: data })
      .where(eq(evidenceItems.id, item.id));
  } catch (err) {
    console.error("Extraction failed for evidence item", item.id, err);
    await db
      .update(evidenceItems)
      .set({
        extractionStatus: "error",
        errorMessage: err instanceof Error ? err.message : "Extraction failed",
      })
      .where(eq(evidenceItems.id, item.id));
  }
};

//call final LLM, rule signal 
const finalizeIfReady = async (caseId: string) => {
  const items = await db.query.evidenceItems.findMany({
    where: eq(evidenceItems.caseId, caseId),
  });

  if (items.some((item) => item.extractionStatus === "pending")) return;

  const successfulResults = items
    .filter((item) => item.extractionStatus === "success" && item.extractedData)
    .map((item) => item.extractedData);

  if (successfulResults.length === 0) {
    await db.update(cases).set({ status: "failed" }).where(eq(cases.id, caseId));
    return;
  }

  const claimed = await db
    .update(cases)
    .set({ status: "finalizing" })
    .where(and(eq(cases.id, caseId), eq(cases.status, "processing")))
    .returning({ id: cases.id, context: cases.context });

  if (claimed.length === 0) return;

  try {
    const cleanResults = successfulResults.flatMap((r) => (r ? [r] : []));
    const signals = await ruleSignalEngine(cleanResults);
    const report = await finalizeCase(cleanResults, signals, claimed[0].context ?? undefined);

    await db
      .update(cases)
      .set({
        title: report.title,
        summary: report.summary,
        riskLevel: report.riskLevel,
        verifySteps: report.verifySteps,
        signals,
        status: "ready",
        contradictions: report.contradictions,
      })
      .where(eq(cases.id, caseId));
  } catch (err) {
    console.error("Failed to generate final report", err);
    await db.update(cases).set({ status: "failed" }).where(eq(cases.id, caseId));
  }
};

//main function
export const processCase = async (caseId: string) => {
  const items = await db.query.evidenceItems.findMany({
    where: eq(evidenceItems.caseId, caseId),
  });

  const pendingItems = items.filter((item) => item.extractionStatus === "pending");
  await Promise.all(pendingItems.map((item) => processEvidenceItem(item)));
  await finalizeIfReady(caseId);
};
