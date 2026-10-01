import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { cases, evidenceItems } from "@/lib/db/schema";
import { convertDocxToText } from "@/lib/pipeline/convertDocx";
import {
  extractEvidence,
  extractFromText,
} from "@/lib/pipeline/extractEvidence";
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
  const response = await fetch(item.fileUrl, {
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    throw new Error(`Failed to download evidence file: ${response.status}`);
  }
  return Buffer.from(await response.arrayBuffer());
};

//extract evidence from the uploaded file's buffer
const processEvidenceItem = async (item: EvidenceItem) => {
  console.log(`[${item.caseId}] item start: ${item.fileName} (${item.mimeType})`);
  try {
    const buffer = await getEvidenceBuffer(item);
    console.log(`[${item.caseId}] item downloaded: ${item.fileName}, ${buffer.length} bytes`);
    let data;
    if (item.mimeType === DOCX_MIME_TYPE) {
      const text = await convertDocxToText(buffer);
      data = await extractFromText(text);
    } else if (item.mimeType === "text/plain") {
      data = await extractFromText(buffer.toString("utf-8"));
    } else {
      data = await extractEvidence({
        imageBuffer: buffer,
        mimeType: item.mimeType,
      });
    }

    await db
      .update(evidenceItems)
      .set({ extractionStatus: "success", extractedData: data })
      .where(eq(evidenceItems.id, item.id));
    console.log(`[${item.caseId}] item success: ${item.fileName}`);
  } catch (err) {
    console.error(`[${item.caseId}] item failed: ${item.fileName}`, err);
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

  if (items.some((item) => item.extractionStatus === "pending")) {
    console.log(`[${caseId}] still has pending items, skipping finalize`);
    return;
  }

  const successfulItems = items.flatMap((item) =>
    item.extractionStatus === "success" && item.extractedData
      ? [{ ...item, extractedData: item.extractedData }]
      : [],
  );

  if (successfulItems.length === 0) {
    console.log(`[${caseId}] no successful items, marking failed`);
    await db
      .update(cases)
      .set({ status: "failed" })
      .where(eq(cases.id, caseId));
    return;
  }

  const claimed = await db
    .update(cases)
    .set({ status: "finalizing" })
    .where(and(eq(cases.id, caseId),  inArray(cases.status, ["processing", "finalizing"])))
    .returning({ id: cases.id, context: cases.context });

  if (claimed.length === 0) {
    console.log(`[${caseId}] claim matched 0 rows, skipping`);
    return;
  }
  console.log(`[${caseId}] finalizing with ${successfulItems.length} items`);

  try {
    const cleanResults = successfulItems.map((item) => item.extractedData);
    const evidenceForReport = successfulItems.map((item) => ({
      fileName: item.fileName,
      data: item.extractedData,
      rawText: item.rawText ?? undefined,
    }));
    const signals = await ruleSignalEngine(cleanResults);
    console.log(`[${caseId}] signals done: ${signals.length}`);
    const report = await finalizeCase(
      evidenceForReport,
      signals,
      claimed[0].context ?? undefined,
    );
    console.log(`[${caseId}] report generated, risk=${report.riskLevel}`);

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
        redFlags: report.redFlags
      })
      .where(eq(cases.id, caseId));
    console.log(`[${caseId}] status -> ready`);
  } catch (err) {
    console.error(`[${caseId}] final report failed`, err);
    await db
      .update(cases)
      .set({ status: "failed" })
      .where(eq(cases.id, caseId));
  }
};

//main function
export const processCase = async (caseId: string) => {
  console.log(`[${caseId}] processCase start`);
  const items = await db.query.evidenceItems.findMany({
    where: eq(evidenceItems.caseId, caseId),
  });

  const pendingItems = items.filter(
    (item) => item.extractionStatus === "pending",
  );
  console.log(`[${caseId}] items: ${items.length} total, ${pendingItems.length} pending`);
  await Promise.all(pendingItems.map((item) => processEvidenceItem(item)));
  await finalizeIfReady(caseId);
  console.log(`[${caseId}] processCase done`);
};
