"use server";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cases, evidenceItems } from "@/lib/db/schema";

import { PASTED_TEXT_LABEL } from "@/lib/pipeline/constants";
import { uploadEvidenceFile } from "@/lib/pipeline/uploadEvidence";
import { checkCaseRateLimit } from "@/lib/rate-limit/case-rate-limit";

import { CASE_QUEUE_NAME, caseQueue } from "@/lib/queue/caseQueue";
import { fileTypeFromBuffer } from "file-type";

const ACCEPTED_FILE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];
const MAX_FILE_SIZE_MB = 10;
const MAX_FILES = 3;

//upload to cloudinary
const processUpload = async (
  evidenceItemId: string,
  caseId: string,
  buffer: Buffer,
  mimeType: string,
) => {
  try {
    const url = await uploadEvidenceFile(buffer, {
      folder: `scam-scanner/cases/${caseId}`,
      publicId: evidenceItemId,
      mimeType,
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
  const userId = session?.user.id;
  const rateLimit = await checkCaseRateLimit(userId);
  if (!rateLimit.allowed) {
    if (rateLimit.reason === "TEN_MIN_LIMIT") {
      return {
        success: false,
        error: `You can create up to 3 investigations every 10 minutes. Please Retry again ${rateLimit.retryAt}`,
      };
    }
    return {
      success: false,
      error: `You can create up to 8 investigations in 24 hours. Please Retry again ${rateLimit.retryAt}`,
    };
  }

  const files = formData
    .getAll("files")
    .filter((f): f is File => f instanceof File);

  if (files.length > MAX_FILES) {
    return {
      success: false,
      error: "You can attach up to 3 files",
    };
  }

  const overSized = files.find((f) => f.size > MAX_FILE_SIZE_MB * 1024 * 1024);
  if (overSized) {
    return {
      success: false,
      error: `${overSized.name} is over 10 MB limit`,
    };
  }
  const wrongFileType = files.find(
    (f) => !ACCEPTED_FILE_TYPES.includes(f.type),
  );
  if (wrongFileType) {
    return {
      success: false,
      error: `${wrongFileType.name} invalid file type`,
    };
  }

  const fileBuffers = await Promise.all(
    files.map(async (f) => ({
      file: f,
      buffer: Buffer.from(await f.arrayBuffer()),
    })),
  );

  for (const { file: f, buffer } of fileBuffers) {
    if (f.type === "text/plain") continue;
    const detected = await fileTypeFromBuffer(buffer);
    if (!detected || detected.mime !== f.type) {
      return {
        success: false,
        error: `${f.name} doesn't match its declared file type.`,
      };
    }
  }

  const context = formData.get("context");
  const extraContext =
    typeof context === "string" && context.trim() ? context : undefined;
  const textEvidence = formData.get("textEvidence");
  const pastedTextEvidence =
    typeof textEvidence === "string" && textEvidence.trim()
      ? textEvidence.trim()
      : undefined;
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
    rawText?: string;
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
      ...fileBuffers.map(({ file, buffer }) => ({
        fileName: file.name,
        mimeType: file.type,
        buffer,
        isUpload: true,
      })),
      ...(pastedTextEvidence
        ? [
            {
              fileName: PASTED_TEXT_LABEL,
              mimeType: "text/plain",
              buffer: Buffer.from(pastedTextEvidence, "utf-8"),
              isUpload: false,
              rawText: pastedTextEvidence,
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
          rawText: source.rawText ?? null,
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

  await Promise.all(
    insertedItems.map((item, i) => {
      const source = evidenceSources[i];
      if (!source.isUpload) return Promise.resolve();
      return processUpload(item.id, newCase.id, source.buffer, source.mimeType);
    }),
  );

  try {
    await caseQueue.add(CASE_QUEUE_NAME, { caseId: newCase.id });
  } catch (err) {
    console.error("Failed to enqueue case for processing", newCase.id, err);
    await db
      .update(cases)
      .set({ status: "failed" })
      .where(eq(cases.id, newCase.id));
    return {
      success: false,
      error: "Failed to queue your case for processing. Please try again.",
    };
  }

  redirect(`/case/${newCase.id}`);
};
