import Groq from "groq-sdk";
import { z } from "zod";
import type { ExtractionResult } from "./extractEvidence";
import { Signal } from "./ruleSignalEngine";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const GROQ_TEXT_MODEL = "openai/gpt-oss-120b";

export const caseReportSchema = z.object({
  title: z.string(),
  summary: z.string(),
  riskLevel: z.enum(["low", "medium", "high"]),
  verifySteps: z.array(z.string()).default([]),
});

export type CaseReport = z.infer<typeof caseReportSchema>;

const riskRank = {
  low: 0,
  medium: 1,
  high: 2,
} as const;
const riskFromRank = ["low", "medium", "high"] as const;
const calculateRisk = (
  riskLevel: CaseReport["riskLevel"],
  signals: Signal[],
): CaseReport["riskLevel"] => {
  if (signals.length === 0) return riskLevel;
  const highestSignal = Math.max(
    ...signals.map((signal) => riskRank[signal.severity]),
  );

  const finalRank = Math.max(highestSignal, riskRank[riskLevel]);
  return riskFromRank[finalRank];
};
export const finalizeCase = async (
  evidenceResult: ExtractionResult[],
  signals: Signal[],
  context?: string,
): Promise<CaseReport> => {
  const evidenceBlocks = evidenceResult
    .map(
      (r, i) => `Evidence #${i + 1}
  Names: ${r.names},
  companies:${r.companies},
  Amounts: ${r.amounts},
  Dates: ${r.dates},
  Claims: ${r.claims},
  PhoneNumbers: ${r.phoneNumbers},
  AccountNumbers: ${r.accountNumbers},
  TransactionIds: ${r.transactionIds},
  ReferenceIds: ${r.referenceIds},
  URLs: ${r.urls},
  emails: ${r.emails},
  handles: ${r.handles}

  `,
    )
    .join("\n\n");
  const signalsText = signals.length
    ? signals
        .map(
          (s) => `- [${s.severity.toUpperCase()}] ${s.label}: ${s.description}`,
        )
        .join("\n")
    : "none detected";
  const prompt = `You are summarizing a potential scam case based on extracted evidence from one or more uploaded files. A rule-based signal detection pass has already run — weigh it alongside the evidence below.

Evidence:
${evidenceBlocks}
Rule-based signals detected:
${signalsText}
${context?.trim() ? `User's own description of what happened (not extracted evidence — may include their own interpretation):\n${context}\n` : ""}
Return JSON with this exact shape:
{
  "title": "a short, descriptive 6-10 word title, no quotes, no trailing punctuation",
  "summary": "a 2-4 sentence plain-language summary of what's happening in this case",
  "riskLevel": "low" | "medium" | "high",
  "verifySteps": ["2-4 concrete, specific things to verify next, based on what's mentioned above"]
}`;
  const compilation = await groq.chat.completions.create({
    model: GROQ_TEXT_MODEL,
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });
  const raw = compilation.choices[0]?.message?.content;
  const parsed = caseReportSchema.safeParse(JSON.parse(raw ?? "{}"));

  if (!parsed.success) {
    throw new Error(
      `Groq report didn't match expected shape: ${JSON.stringify(parsed.error.issues)}`,
    );
  }
  return {
    ...parsed.data,
    riskLevel: calculateRisk(parsed.data.riskLevel, signals),
  };
};
