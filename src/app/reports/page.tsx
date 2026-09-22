import { getUserCases } from "@/actions/get-user-cases-action";
import { ReportsListClient } from "@/components/reports/ReportsListClient";

export default async function ReportsPage() {
  const { items, hasMore } = await getUserCases(1);

  return (
    <main className="flex flex-1 justify-center px-6 py-10 md:px-12">
      <div className="flex w-full max-w-[760px] flex-col gap-6">
        <div>
          <p className="font-mono text-xs text-muted-foreground">Dashboard</p>
          <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight">
            Your reports
          </h1>
        </div>

        <ReportsListClient initialItems={items} initialHasMore={hasMore} />
      </div>
    </main>
  );
}
