"use server";

import { extractEvidence, extractFromText, type ExtractionResult } from "@/lib/pipeline/extractEvidence";
import { convertDocxToText } from "@/lib/pipeline/convertDocx";

type ExtractActionResult =
  | { success: true; data: ExtractionResult }
  | { success: false; error: string };

const DOCX_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export async function extractEvidenceAction(
  formData: FormData
): Promise<ExtractActionResult> {
  const file = formData.get("file");
  const text = formData.get("text");
  const extraContext = typeof text === "string" ? text : undefined;

  if (!(file instanceof File)) {
    return { success: false, error: "No file provided" };
  }

  try {
    if (file.type === DOCX_MIME_TYPE) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const documentText = await convertDocxToText(buffer);
      const data = await extractFromText(documentText, extraContext);
      return { success: true, data };
    }
      if (file.type === "text/plain") {
      const documentText = await file.text();
      const data = await extractFromText(documentText, extraContext);
      return { success: true, data };
    }
    //for images and pdfs
    const imageBuffer = Buffer.from(await file.arrayBuffer());
    const data = await extractEvidence({
      imageBuffer,
      mimeType: file.type,
      text: extraContext,
    });
    return { success: true, data };
  } catch (err) {
    console.error("extractEvidenceAction failed", err);
    return { success: false, error: "Extraction failed" };
  }
}
