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
  contradictions: z.array(
    z.object({
      description: z.string(),
      evidence: z.array(z.string()),
      severity: z.enum(["low", "medium", "high"]),
    }),
  ).default([]),
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
      (r, i) => `
--- Evidence #${i + 1} ---
Names: ${r.names.join(", ")}
Companies: ${r.companies.join(", ")}
Amounts: ${r.amounts.join(", ")}
Dates: ${r.dates.join(", ")}
Claims: ${r.claims.join("; ")}
Phone numbers: ${r.phoneNumbers.join(", ")}
Account numbers: ${r.accountNumbers.join(", ")}
Transaction IDs: ${r.transactionIds.join(", ")}
Reference IDs: ${r.referenceIds.join(", ")}
URLs: ${r.urls.join(", ")}
Emails: ${r.emails.join(", ")}
Handles: ${r.handles.join(", ")}
`,
    )
    .join("\n");
  const signalsText = signals.length
    ? signals
        .map(
          (s) => `- [${s.severity.toUpperCase()}] ${s.label}: ${s.description}`,
        )
        .join("\n")
    : "none detected";

  const prompt = `
You are the final reasoning and case-reporting system for a scam-analysis application.

Your task is to analyze multiple pieces of extracted evidence, rule-based signals,
and optional user-provided context and produce a concise, evidence-grounded case report.

The evidence may contain screenshots, messages, invoices, receipts, documents,
emails, payment records, or other sources. Each evidence item is labeled separately
as Evidence #1, Evidence #2, etc.

IMPORTANT:
- Do not invent facts that are not supported by the provided information.
- Do not assume that a rule-based signal is automatically proof of a scam.
- Do not assume that the user's description is automatically correct.
- Do not ignore contradictions between evidence items.
- Do not ignore contradictions between the evidence and the user's description.
- Distinguish between what each evidence item explicitly states and what can
  reasonably be concluded from comparing them.
- If information is missing or contradictory, report the uncertainty instead of guessing.

CROSS-EVIDENCE CONTRADICTION ANALYSIS:

Compare the evidence items against each other and identify explicit contradictions
or meaningful discrepancies.

Pay particular attention to:

1. Amounts
   - Different payment amounts
   - Different prices, fees, balances, or promised amounts

2. Dates and times
   - Conflicting transaction dates
   - Different deadlines
   - Claims that an event happened before/after another event when the evidence
     gives conflicting dates

3. Identities
   - Different names for the same claimed person
   - Different companies or organizations claiming to represent the same entity
   - Conflicting sender identities

4. Payment information
   - Different account numbers
   - Different wallet addresses
   - Different transaction IDs
   - Different payment recipients

5. Claims and promises
   - One evidence item says something happened while another says it did not
   - One document promises one amount while another records a different amount
   - One message says a payment is required while another says no payment is required

6. Status or outcome
   - "Payment received" vs "Payment not received"
   - "Refund issued" vs "Refund pending"
   - "Account verified" vs "Account not verified"

IMPORTANT CONTRADICTION RULES:

- Only flag a contradiction when the provided evidence actually supports both
  conflicting statements.
- Do not treat merely different values as contradictions when they could
  legitimately refer to different transactions, people, dates, or events.
- If two amounts are different but clearly belong to different transactions,
  do not flag them as contradictory.
- If the relationship between two values is unclear, describe it as a discrepancy
  or unresolved difference rather than asserting a contradiction.
- Never decide which conflicting value is correct unless the evidence itself
  establishes that.
- Include the specific evidence items supporting each side of the contradiction.
- Do not create a contradiction merely because information is missing from one
  evidence item.

USER CONTEXT:

The user's description is separate from the uploaded evidence.

Use it to identify possible discrepancies with the evidence, but do not treat it
as extracted evidence.

If the user's description conflicts with the uploaded evidence, report that
separately as a contradiction or discrepancy and clearly identify that one side
comes from the user.

REASONING:

Before producing the JSON, internally analyze:

1. What each evidence item explicitly states.
2. Which rule-based signals are supported.
3. Whether different evidence items agree or conflict.
4. Whether the user's description agrees with or conflicts with the evidence.
5. Whether apparent differences actually refer to the same event.
6. What important uncertainty remains.
7. What overall risk level is supported by the available information.

Do not output this internal analysis.

RISK:

The risk level should represent the overall level of concern supported by the
available information.

- low: little evidence of harmful or deceptive behavior, or the available
  information is largely consistent and low concern.
- medium: meaningful warning signs, inconsistencies, or unresolved concerns
  are present, but the available information does not establish a stronger
  conclusion.
- high: strong or multiple indicators of potentially harmful or deceptive
  activity are present, especially when supported by independent evidence,
  significant contradictions, or multiple corroborating warning signs.

Verification steps must be concrete and directly related to the evidence.
Prioritize steps that could independently confirm or disprove important claims,
payment details, identities, URLs, transactions, or contradictions.

Evidence:
${evidenceBlocks}

Rule-based signals detected:
${signalsText}

${
  context?.trim()
    ? `User's own description of what happened:
${context}

This is user-provided context, not extracted evidence.`
    : "No user-provided context was provided."
}

Return JSON with exactly this shape:

{
  "title": "a short, descriptive 6-10 word title, no quotes, no trailing punctuation",
  "summary": "a 2-4 sentence plain-language summary grounded in the provided information",
  "riskLevel": "low" | "medium" | "high",
  "contradictions": [
    {
      "description": "a concise description of the contradiction or discrepancy",
      "evidence": [
        "specific statement from Evidence #1",
        "specific statement from Evidence #2"
      ],
      "severity": "low" | "medium" | "high"
    }
  ],
  "verifySteps": [
    "2-4 concrete, specific things to verify next"
  ]
}

If there are no meaningful contradictions or discrepancies, return:

"contradictions": []
`;

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
