import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const extractionSchema = z.object({
  names: z.array(z.string()).default([]),
  companies: z.array(z.string()).default([]),
  amounts: z.array(z.string()).default([]),
  dates: z.array(z.string()).default([]),
  claims: z.array(z.string()).default([]),
});

const SUPPORTED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf",
];

export type ExtractionResult = z.infer<typeof extractionSchema>;

const EXTRACTION_PROMPT = `You are analyzing a potential scam. Look at the attached screenshot and any pasted text together, as one piece of evidence.

Extract the following as JSON, with no commentary outside the JSON:
- names: any person names mentioned
- companies: any company/organization names mentioned
- amounts: any sums of money mentioned, as written (e.g. "$500", "\u09f320,000")
- dates: any dates or relative time references mentioned, as written (e.g. "next Monday", "March 3rd")
- claims: short factual claims being made in the message (e.g. "requires an upfront equipment fee", "guarantees weekly returns")

If a category has nothing, return an empty array for it. Return only valid JSON matching this shape:
{"names": string[], "companies": string[], "amounts": string[], "dates": string[], "claims": string[]}`;

interface ExtractEvidenceInput {
  imageBuffer: Buffer;
  mimeType: string;
  text?: string;
}

export async function extractEvidence({
  imageBuffer,
  mimeType,
  text,
}: ExtractEvidenceInput): Promise<ExtractionResult> {

    if(!SUPPORTED_MIME_TYPES.includes(mimeType)){
        throw new Error(`Unsupported file type for extraction: ${mimeType}`)
    }
  const base64Image = imageBuffer.toString("base64");

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        role: "user",
        parts: [
          { text: EXTRACTION_PROMPT },
          ...(text?.trim() ? [{ text: `Extra context from the user: ${text}` }] : []),
          { inlineData: { mimeType, data: base64Image } },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
    },
  });

  const raw = response.text;
  const parsed = extractionSchema.safeParse(JSON.parse(raw ?? "{}"));

  if (!parsed.success) {
    throw new Error(
      `Gemini output didn't match expected shape: ${JSON.stringify(parsed.error.issues)}`
    );
  }

  return parsed.data;
}
