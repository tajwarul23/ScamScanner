"use client";

import { useState } from "react";
import Link from "next/link";
import { FileText, Loader2Icon } from "lucide-react";
import { getUserCases, type UserCase } from "@/actions/get-user-cases-action";
import { CaseCard } from "@/components/reports/CaseCard";

interface ReportsListClientProps {
  initialItems: UserCase[];
  initialHasMore: boolean;
}

export function ReportsListClient({ initialItems, initialHasMore }: ReportsListClientProps) {
  const [items, setItems] = useState(initialItems);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const loadMore = async () => {
    setIsLoading(true);
    try {
      const nextPage = page + 1;
      const result = await getUserCases(nextPage);
      setItems((prev) => [...prev, ...result.items]);
      setHasMore(result.hasMore);
      setPage(nextPage);
    } finally {
      setIsLoading(false);
    }
  };

  
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border py-16 text-center">
        <FileText className="size-8 text-muted-foreground" strokeWidth={1.5} />
        <p className="text-sm text-muted-foreground">
          You haven&apos;t started an investigation yet.
        </p>
        <Link href="/case/create" className="text-sm font-medium text-primary hover:underline">
          Start a free investigation
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2.5">
        {items.map((item) => (
          <CaseCard key={item.id} item={item} />
        ))}
      </div>

      {hasMore && (
        <button
          type="button"
          onClick={loadMore}
          disabled={isLoading}
          className="mx-auto cursor-pointer inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50"
        >
          {isLoading && <Loader2Icon className="size-3.5 animate-spin" />}
          {isLoading ? "Loading…" : "Load more"}
        </button>
      )}
    </div>
  );
}
