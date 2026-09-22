import Link from "next/link";
import { AlertTriangle, Loader2Icon, ShieldAlert, ShieldCheck, XCircle } from "lucide-react";
import type { UserCase } from "@/actions/get-user-cases-action";

const riskStyles: Record<string, string> = {
  low: "bg-risk-low-bg text-risk-low",
  medium: "bg-risk-med-bg text-risk-med",
  high: "bg-risk-high-bg text-risk-high",
};

const riskIcons: Record<string, typeof AlertTriangle> = {
  low: ShieldCheck,
  medium: ShieldAlert,
  high: AlertTriangle,
};

const statusConfig: Record<string, { label: string; className: string; spin?: boolean }> = {
  processing: { label: "Analyzing", className: "text-muted-foreground", spin: true },
  finalizing: { label: "Finalizing", className: "text-muted-foreground", spin: true },
  failed: { label: "Failed", className: "text-destructive" },
};

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function CaseCard({ item }: { item: UserCase }) {
  const RiskIcon = item.riskLevel ? riskIcons[item.riskLevel] : null;
  const status = statusConfig[item.status];

  return (
    <Link
      href={`/case/${item.id}`}
      className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/40"
    >
      <div className="flex flex-1 flex-col gap-1 overflow-hidden">
        <span className="truncate text-base font-medium text-foreground">
          {item.title ?? "Generating report…"}
        </span>
        <span className="font-mono text-xs text-muted-foreground">
          {item.evidenceItems.length} evidence item{item.evidenceItems.length !== 1 ? "s" : ""} ·{" "}
          {formatDate(item.createdAt)}
        </span>
      </div>

      {item.riskLevel && RiskIcon ? (
        <span
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1 font-mono text-xs font-medium uppercase tracking-wide ${riskStyles[item.riskLevel]}`}
        >
          <RiskIcon className="size-3.5" strokeWidth={1.8} />
          {item.riskLevel}
        </span>
      ) : status ? (
        <span
          className={`inline-flex shrink-0 items-center gap-1.5 text-xs font-medium ${status.className}`}
        >
          {status.spin ? (
            <Loader2Icon className="size-3.5 animate-spin" />
          ) : (
            <XCircle className="size-3.5" />
          )}
          {status.label}
        </span>
      ) : null}
    </Link>
  );
}
