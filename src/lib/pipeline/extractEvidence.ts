import { GoogleGenAI } from "@google/genai";
import Groq from "groq-sdk";
import { PDFParse } from "pdf-parse";
import { date, z } from "zod";
import { withFallBack } from "../resilience/withFallback";
import { error } from "console";

const gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const GROQ_VISION_MODEL = "qwen/qwen3.8-27b";
const GROQ_TEXT_MODEL = "openai/gpt-oss-120b";
const GEMINI_MODEL = "gemini-2.5-flash";

export const extractionSchema = z.object({
  names: z.array(z.string()).default([]),
  companies: z.array(z.string()).default([]),
  amounts: z.array(z.string()).default([]),
  dates: z.array(z.string()).default([]),
  claims: z.array(z.string()).default([]),
  phoneNumbers: z.array(z.string()).default([]),
  accountNumbers: z.array(z.string()).default([]),

});

export type ExtractionResult = z.infer<typeof extractionSchema>;

const SUPPORTED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf",
];

const EXTRACTION_PROMPT = `You are analyzing a potential scam. Look at the attached screenshot and any pasted text together, as one piece of evidence.

Extract the following as JSON, with no commentary outside the JSON:
- names: any person names mentioned
- companies: any company/organization names mentioned
- amounts: any sums of money mentioned, as written (e.g. "$500", "\u09f320,000")
- dates: any dates or relative time references mentioned, as written (e.g. "next Monday", "March 3rd")
- claims: short factual claims being made in the message (e.g. "requires an upfront equipment fee", "guarantees weekly returns")

If a category has nothing, return an empty array for it. Return only valid JSON matching this shape:
{"names": string[], "companies": string[], "amounts": string[], "dates": string[], "claims": string[], "phoneNumbers" : string[],"accountNumbers" : string[] }`;

interface ExtractEvidenceInput {
  imageBuffer: Buffer;
  mimeType: string;
  text?: string;
}

const parseExtraction = (
  raw: string | null | undefined,
  provider: string,
): ExtractionResult => {
  const parsed = extractionSchema.safeParse(JSON.parse(raw ?? "{}"));
  if (!parsed.success) {
    throw new Error(
      `${provider}'s output didn't match the expected shape: ${JSON.stringify(parsed.error?.issues)}`,
    );
  }

  return parsed.data;
};

//******************Text Based extraction (docx turns to text)*******************
//First with Gemini
const extractTextWithGemini = async (
  documentText: string,
  extraContext?: string,
): Promise<ExtractionResult> => {
  const response = await gemini.models.generateContent({
    model: GEMINI_MODEL,
    contents: [
      {
        role: "user",
        parts: [
          { text: EXTRACTION_PROMPT },
          { text: `Document Content : ${documentText}` },
          ...(extraContext?.trim()
            ? [{ text: `Extra context from the user : ${extraContext}` }]
            : []),
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
    },
  });

  return parseExtraction(response.text, "Gemini");
};
//if gemini fails fallback to Groq
const extractTextWithGroq = async (
  documentText: string,
  extraContext?: string,
): Promise<ExtractionResult> => {
  const promptText =
    EXTRACTION_PROMPT +
    `\n\n Document content : ${documentText}` +
    (extraContext?.trim()
      ? `\n\nExtra context from the user :${extraContext}`
      : "");

  const completion = await groq.chat.completions.create({
    model: GROQ_TEXT_MODEL,
    messages: [
      {
        role: "user",
        content: promptText,
      },
    ],
    response_format: { type: "json_object" },
  });

  return parseExtraction(completion.choices[0]?.message?.content, "Groq");
};
export const extractFromText = async (
  documentText: string,
  extraContext?: string,
): Promise<ExtractionResult> => {
  return withFallBack(
    () => extractTextWithGemini(documentText, extraContext),
    () => extractTextWithGroq(documentText, extraContext),
    (error) =>
      console.warn(
        "Gemini text extraction failed, falling back to Groq:",
        error,
      ),
  );
};

//****************** img/pdf extraction *******************
//first with gemini
export const extractWithGemini = async ({
  imageBuffer,
  mimeType,
  text,
}: ExtractEvidenceInput): Promise<ExtractionResult> => {
  const base64Image = imageBuffer.toString("base64");

  const response = await gemini.models.generateContent({
    model: GEMINI_MODEL,
    contents: [
      {
        role: "user",
        parts: [
          { text: EXTRACTION_PROMPT },
          ...(text?.trim()
            ? [{ text: `Extra context from the user: ${text}` }]
            : []),
          { inlineData: { mimeType, data: base64Image } },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
    },
  });

  return parseExtraction(response.text, "Gemini");
};

//groq if gemini failse
export const extractWithGroq = async ({
  imageBuffer,
  mimeType,
  text,
}: ExtractEvidenceInput): Promise<ExtractionResult> => {
    console.log("Groq with vision");
    
  const base64Image = imageBuffer.toString("base64");
  const promptText =
    EXTRACTION_PROMPT +
    (text?.trim() ? `\n\nExtra context from the user: ${text}` : "");

  const completion = await groq.chat.completions.create({
    model: GROQ_VISION_MODEL,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: promptText },
          {
            type: "image_url",
            image_url: { url: `data:${mimeType};base64,${base64Image}` },
          },
        ],
      },
    ],
    response_format: { type: "json_object" },
  });

  return parseExtraction(completion.choices[0]?.message?.content, "Groq");
};



export const extractPdfWithGroqText = async ({
  imageBuffer,
  text,
}: ExtractEvidenceInput): Promise<ExtractionResult> => {
  const parser = new PDFParse({ data: imageBuffer });
  const { text: pdfText } = await parser.getText();

  if (pdfText.trim().length < 20) {
    throw new Error(
      "PDF has no extractable text (likely a scanned document) — fallback cannot process it",
    );
  }

  return extractTextWithGroq(pdfText, text);
};

export const extractEvidence = async(input: ExtractEvidenceInput) : Promise<ExtractionResult> =>{
if (!SUPPORTED_MIME_TYPES.includes(input.mimeType)) {
    throw new Error(`Unsupported file type for extraction: ${input.mimeType}`);
  }

  const fallback =
    input.mimeType === "application/pdf"
      ? () => extractPdfWithGroqText(input)
      : () => extractWithGroq(input);

  return withFallBack(
    () => extractWithGemini(input),
    fallback,
    (error) => console.warn("Gemini extraction failed, falling back to Groq:", error)
  );
}