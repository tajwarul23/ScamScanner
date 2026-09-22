"use server";

import { desc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cases } from "@/lib/db/schema";

const REPORTS_PAGE_SIZE = 2;

export async function getUserCases(page: number) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return { items: [], hasMore: false };
  }

  const offset = (page - 1) * REPORTS_PAGE_SIZE;

  const rows = await db.query.cases.findMany({
    where: eq(cases.userId, session.user.id),
    orderBy: [desc(cases.createdAt)],
    limit: REPORTS_PAGE_SIZE + 1,
    offset,
    with: { evidenceItems: true },
  });

  const hasMore = rows.length > REPORTS_PAGE_SIZE;

  return {
    items: rows.slice(0, REPORTS_PAGE_SIZE),
    hasMore,
  };
}

export type UserCase = Awaited<ReturnType<typeof getUserCases>>["items"][number];
