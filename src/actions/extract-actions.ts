"use server";

import { extractEvidence, type ExtractionResult } from "@/lib/pipeline/extractEvidence";

type ExtractActionResult =
  | { success: true; data: ExtractionResult }
  | { success: false; error: string };

export async function extractEvidenceAction(
  formData: FormData
): Promise<ExtractActionResult> {
  const file = formData.get("file");
  const text = formData.get("text");

  if (!(file instanceof File)) {
    return { success: false, error: "No file provided" };
  }

  try {
    const imageBuffer = Buffer.from(await file.arrayBuffer());
    const data = await extractEvidence({
      imageBuffer,
      mimeType: file.type,
      text: typeof text === "string" ? text : undefined,
    });
    return { success: true, data };
  } catch (err) {
    console.error("extractEvidenceAction failed", err);
    return { success: false, error: "Extraction failed" };
  }
}
