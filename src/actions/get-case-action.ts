"use server";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { cases } from "@/lib/db/schema";

export async function getCaseData(caseId: string) {
  const caseData = await db.query.cases.findFirst({
    where: eq(cases.id, caseId),
    with: { evidenceItems: true },
  });

  return caseData ?? null;
}

export type CaseData = Awaited<ReturnType<typeof getCaseData>>;
