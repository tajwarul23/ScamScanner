"use server";

import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cases } from "@/lib/db/schema";

export async function getCaseData(caseId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return null;
  }

  const caseData = await db.query.cases.findFirst({
    where: and(eq(cases.id, caseId), eq(cases.userId, session.user.id)),
    with: { evidenceItems: true },
  });

  return caseData ?? null;
}

export type CaseData = Awaited<ReturnType<typeof getCaseData>>;
