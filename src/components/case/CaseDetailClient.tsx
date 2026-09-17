"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, FileImage, FileText, Loader2Icon, XCircle } from "lucide-react";
import { getCaseData, type CaseData } from "@/actions/get-case-action";

const riskStyles: Record<string, string> = {
  low: "bg-risk-low-bg text-risk-low",
  medium: "bg-risk-med-bg text-risk-med",
  high: "bg-risk-high-bg text-risk-high",
};

const POLL_INTERVAL_MS = 3000;

interface CaseDetailClientProps {
  caseId: string;
  initialCase: NonNullable<CaseData>;
}

export function CaseDetailClient({ caseId, initialCase }: CaseDetailClientProps) {
  const [caseData, setCaseData] = useState(initialCase);

  useEffect(() => {
    if (caseData.status !== "processing") return;

    const interval = setInterval(async () => {
      const latest = await getCaseData(caseId);
      if (latest) {
        setCaseData(latest);
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [caseData.status, caseId]);

  const isProcessing = caseData.status === "processing";
  const isFailed = caseData.status === "failed";

  return (
    <main className="flex flex-1 justify-center px-6 py-10 md:px-12">
      <div className="flex w-full max-w-[760px] flex-col gap-6">
        <div>
          <p className="font-mono text-xs text-muted-foreground">Case</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="font-serif text-2xl font-semibold">
              {caseData.title ?? "Generating report…"}
            </h1>
            {caseData.riskLevel && (
              <span
                className={`inline-flex items-center rounded-md px-2.5 py-1 font-mono text-[11px] font-medium uppercase tracking-wide ${riskStyles[caseData.riskLevel]}`}
              >
                {caseData.riskLevel} risk
              </span>
            )}
          </div>
        </div>

        {isProcessing && (
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
            <Loader2Icon className="size-4 animate-spin" />
            Analyzing your evidence — this updates automatically.
          </div>
        )}

        {isFailed && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            We couldn&apos;t analyze any of the evidence in this case. Try creating a new investigation with different files.
          </div>
        )}

        {caseData.status === "ready" && (
          <>
            {caseData.summary && (
              <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-5">
                <h3 className="font-serif text-base font-semibold">Summary</h3>
                <p className="text-sm leading-relaxed text-foreground">
                  {caseData.summary}
                </p>
              </div>
            )}

            {caseData.verifySteps && caseData.verifySteps.length > 0 && (
              <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-5">
                <h3 className="font-serif text-base font-semibold">What to verify next</h3>
                <div className="flex flex-col gap-2.5">
                  {caseData.verifySteps.map((step, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <span className="mt-0.5 size-4 shrink-0 rounded border-[1.5px] border-border" />
                      <span className="text-[13.5px] text-foreground">{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-5">
          <h3 className="font-serif text-base font-semibold">
            Evidence ({caseData.evidenceItems.length})
          </h3>
          <div className="flex flex-col gap-2">
            {caseData.evidenceItems.map((item) => {
              const Icon = item.mimeType.startsWith("image/") ? FileImage : FileText;
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-lg border border-border bg-background px-3.5 py-2.5"
                >
                  <span className="flex size-7.5 shrink-0 items-center justify-center rounded-md bg-accent text-primary">
                    <Icon className="size-4" strokeWidth={1.6} />
                  </span>
                  <span className="flex-1 truncate text-[13.5px]">{item.fileName}</span>
                  {item.extractionStatus === "pending" && (
                    <Loader2Icon className="size-3.5 animate-spin text-muted-foreground" />
                  )}
                  {item.extractionStatus === "success" && (
                    <CheckCircle2 className="size-4 text-risk-low" />
                  )}
                  {item.extractionStatus === "error" && (
                    <XCircle className="size-4 text-destructive" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
