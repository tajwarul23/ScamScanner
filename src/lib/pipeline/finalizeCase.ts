import Groq from "groq-sdk";
import {z} from "zod";
import type {ExtractionResult} from "./extractEvidence";

const groq = new Groq({apiKey:process.env.GROQ_API_KEY});
const GROQ_TEXT_MODEL = "openai/gpt-oss-120b";

export const caseReportSchema = z.object({
    title: z.string(),
    summary: z.string(),
    riskLevel: z.enum(["low", "medium", "high"]),
    verifySteps : z.array(z.string()).default([])
})

export type CaseReport = z.infer<typeof caseReportSchema>;

export const finalizeCase = async(
    evidenceResult : ExtractionResult[]
):Promise<CaseReport> =>{
    const combined = {
        names: evidenceResult.flatMap((r) => r.names),
        companies: evidenceResult.flatMap((r) =>r.companies),
        amounts: evidenceResult.flatMap((r) =>r.amounts),
        dates: evidenceResult.flatMap((r) =>r.dates),
        claims: evidenceResult.flatMap((r) =>r.claims),
    };

    const prompt = `You are summarizing a potential scam case based on extracted evidence from one or more uploaded files. No rule-based signal detection or pattern-matching database has run yet — base your assessment purely on the evidence below.

Names mentioned: ${combined.names.join(", ") || "none"}
Companies mentioned: ${combined.companies.join(", ") || "none"}
Amounts mentioned: ${combined.amounts.join(", ") || "none"}
Dates mentioned: ${combined.dates.join(", ") || "none"}
Claims made: ${combined.claims.join("; ") || "none"}

Return JSON with this exact shape:
{
  "title": "a short, descriptive 6-10 word title, no quotes, no trailing punctuation",
  "summary": "a 2-4 sentence plain-language summary of what's happening in this case",
  "riskLevel": "low" | "medium" | "high",
  "verifySteps": ["2-4 concrete, specific things to verify next, based on what's mentioned above"]
}`
const compilation = await groq.chat.completions.create({
    model: GROQ_TEXT_MODEL,
    messages: [{role: "user", content:prompt}],
    response_format: {type:"json_object"}
});
const raw = compilation.choices[0]?.message?.content;
const parsed = caseReportSchema.safeParse(JSON.parse(raw ?? "{}"));

if(!parsed.success){
    throw new Error(
        `Groq report didn't match expected shape: ${JSON.stringify(parsed.error.issues)}`
    )
}
return parsed.data;
}