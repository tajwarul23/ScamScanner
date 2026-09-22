"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  FileImage,
  FileText,
  Loader2Icon,
  MinusCircle,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { BackButton } from "@/components/ui/back-button";
import { getCaseData, type CaseData } from "@/actions/get-case-action";
import type { Signal } from "@/lib/pipeline/ruleSignalEngine";

type EvidenceItem = NonNullable<CaseData>["evidenceItems"][number];

const riskStyles: Record<string, string> = {
  low: "bg-risk-low-bg text-risk-low",
  medium: "bg-risk-med-bg text-risk-med",
  high: "bg-risk-high-bg text-risk-high",
};

const riskBannerStyles: Record<string, string> = {
  low: "border-risk-low bg-risk-low-bg text-risk-low",
  medium: "border-risk-med bg-risk-med-bg text-risk-med",
  high: "border-risk-high bg-risk-high-bg text-risk-high",
};

const riskIcons: Record<string, typeof AlertTriangle> = {
  low: ShieldCheck,
  medium: ShieldAlert,
  high: AlertTriangle,
};

const riskDescriptions: Record<string, string> = {
  low: "Few or no warning signs were identified.",
  medium: "Some warning signs were identified — proceed carefully.",
  high: "Multiple strong warning signs were identified.",
};

const dotStyles: Record<string, string> = {
  low: "bg-risk-low",
  medium: "bg-risk-med",
  high: "bg-risk-high",
};

const extractionStatusConfig: Record<
  string,
  { label: string; icon: typeof CheckCircle2; className: string }
> = {
  pending: { label: "Analyzing…", icon: Loader2Icon, className: "text-muted-foreground" },
  success: { label: "Analyzed", icon: CheckCircle2, className: "text-risk-low" },
  error: { label: "Failed", icon: XCircle, className: "text-destructive" },
  skipped: { label: "Skipped", icon: MinusCircle, className: "text-muted-foreground" },
};

const POLL_INTERVAL_MS = 3000;

const severityRank: Record<Signal["severity"], number> = {
  low: 0,
  medium: 1,
  high: 2,
};

interface CaseDetailClientProps {
  caseId: string;
  initialCase: NonNullable<CaseData>;
}

function EvidenceQuote({ label, text }: { label: string; text: string }) {
  return (
    <div className="flex-1 rounded-md border border-border bg-background p-2.5">
      <p className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-base text-foreground">&ldquo;{text}&rdquo;</p>
    </div>
  );
}

export function CaseDetailClient({ caseId, initialCase }: CaseDetailClientProps) {
  const [caseData, setCaseData] = useState(initialCase);
  const [previewItem, setPreviewItem] = useState<EvidenceItem | null>(null);

  useEffect(() => {
    if (caseData.status === "ready" || caseData.status === "failed") {
      return;
    }

    const interval = setInterval(async () => {
      const latest = await getCaseData(caseId);
      if (latest) {
        setCaseData(latest);
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [caseData.status, caseId]);

  const isProcessing = caseData.status === "processing" || caseData.status === "finalizing";
  const isFailed = caseData.status === "failed";
  const isReady = caseData.status === "ready";
  const RiskIcon = caseData.riskLevel ? riskIcons[caseData.riskLevel] : null;

  return (
    <main className="flex flex-1 justify-center px-6 py-10 md:px-12">
      <div className="flex w-full max-w-[760px] flex-col gap-6">
        <div>
          <BackButton />
          <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight">
            {caseData.title ?? "Generating report…"}
          </h1>
        </div>

        {caseData.riskLevel && RiskIcon && (
          <div
            className={`flex items-start gap-3 rounded-lg border-l-4 p-4 ${riskBannerStyles[caseData.riskLevel]}`}
          >
            <RiskIcon className="mt-0.5 size-5 shrink-0" strokeWidth={1.8} />
            <div className="flex flex-col gap-1">
              <span className="font-mono text-base font-bold uppercase tracking-wide">
                {caseData.riskLevel} risk
              </span>
              <p className="text-base text-foreground">
                {riskDescriptions[caseData.riskLevel]}
              </p>
            </div>
          </div>
        )}

        {isProcessing && (
          <div className="flex items-center gap-2 rounded-lg border-l-4 border-border bg-card p-4 text-base text-muted-foreground">
            <Loader2Icon className="size-4 animate-spin" />
            Analyzing your evidence — this updates automatically.
          </div>
        )}

        {isFailed && (
          <div className="flex flex-col gap-2 rounded-lg border-l-4 border-destructive bg-destructive/10 p-4 text-base text-destructive">
            <p>
              We couldn&apos;t analyze any of the evidence in this case. Try creating a new
              investigation with different files or try again later.
            </p>
          </div>
        )}

        <Tabs defaultValue="report" >
          <TabsList variant="line" >
            <TabsTrigger className="cursor-pointer" value="report">Report</TabsTrigger>
            <TabsTrigger className="cursor-pointer" value="evidence">
              Evidence ({caseData.evidenceItems.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="report" className="flex flex-col gap-6 pt-4">
            {isReady ? (
              <>
                {caseData.summary && (
                  <div className="flex flex-col gap-2 border-b border-border pb-6">
                    <h2 className="font-mono text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      Summary
                    </h2>
                    <p className="text-base leading-relaxed text-foreground">{caseData.summary}</p>
                  </div>
                )}

                {caseData.signals && caseData.signals.length > 0 && (
                  <div className="flex flex-col gap-3 border-b border-border pb-6">
                    <h2 className="font-mono text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      Key findings
                    </h2>
                    <div className="flex flex-col gap-3">
                      {[...caseData.signals]
                        .sort((a, b) => severityRank[b.severity] - severityRank[a.severity])
                        .map((signal) => (
                          <div key={signal.id} className="flex gap-2.5">
                            <span
                              className={`mt-2 size-2.5 shrink-0 rounded-full ${dotStyles[signal.severity]}`}
                            />
                            <div className="flex flex-col gap-0.5">
                              <span className="text-base font-medium text-foreground">
                                {signal.label}
                              </span>
                              <p className="text-sm text-muted-foreground">
                                {signal.description}
                              </p>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {caseData.contradictions && caseData.contradictions.length > 0 && (
                  <div className="flex flex-col gap-3 border-b border-border pb-6">
                    <div className="flex items-baseline justify-between">
                      <h2 className="font-mono text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                        Conflicting Information
                      </h2>
                      <span className="text-sm text-muted-foreground">
                        {caseData.contradictions.length} conflict
                        {caseData.contradictions.length > 1 ? "s" : ""} found
                      </span>
                    </div>
                    <div className="flex flex-col gap-3">
                      {[...caseData.contradictions]
                        .sort((a, b) => severityRank[b.severity] - severityRank[a.severity])
                        .map((contradiction, i) => (
                          <div key={i} className="rounded-lg border border-border bg-card p-4">
                            <div className="mb-3 flex items-center gap-2">
                              <span
                                className={`inline-flex items-center rounded-md px-2 py-0.5 font-mono text-xs font-medium uppercase tracking-wide ${riskStyles[contradiction.severity]}`}
                              >
                                {contradiction.severity}
                              </span>
                            </div>
                            <p className="mb-3 text-base font-medium text-foreground">
                              {contradiction.description}
                            </p>
                            {contradiction.evidence.length === 2 ? (
                              <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
                                <EvidenceQuote
                                  label="Evidence #1"
                                  text={contradiction.evidence[0]}
                                />
                                <span className="shrink-0 self-center font-mono text-xs font-bold text-muted-foreground">
                                  VS
                                </span>
                                <EvidenceQuote
                                  label="Evidence #2"
                                  text={contradiction.evidence[1]}
                                />
                              </div>
                            ) : (
                              <div className="flex flex-col gap-2">
                                {contradiction.evidence.map((evidence, idx) => (
                                  <EvidenceQuote
                                    key={idx}
                                    label={`Evidence #${idx + 1}`}
                                    text={evidence}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {caseData.verifySteps && caseData.verifySteps.length > 0 && (
                  <div className="flex flex-col gap-3">
                    <h2 className="font-mono text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      What to verify before acting
                    </h2>
                    <div className="flex flex-col gap-2.5">
                      {caseData.verifySteps.map((step, i) => (
                        <div key={i} className="flex items-start gap-2.5">
                          <span className="mt-0.5 size-4 shrink-0 rounded border-[1.5px] border-border" />
                          <span className="text-base text-foreground">{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="py-6 text-center text-base text-muted-foreground">
                {isFailed
                  ? "No report was generated for this case."
                  : "Your report will appear here once the analysis finishes."}
              </p>
            )}
          </TabsContent>

          <TabsContent value="evidence" className="flex flex-col gap-2 pt-4">
            {caseData.evidenceItems.map((item) => {
              const isImage = item.mimeType.startsWith("image/");
              const Icon = isImage ? FileImage : FileText;
              const status = extractionStatusConfig[item.extractionStatus];
              const isViewable = Boolean(item.fileUrl);

              const rowContent = (
                <>
                  <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-md bg-accent">
                    {isImage && item.fileUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.fileUrl}
                        alt={item.fileName}
                        className="size-full object-cover"
                      />
                    ) : (
                      <Icon className="size-4.5 text-primary" strokeWidth={1.6} />
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-0.5 overflow-hidden">
                    <span className="truncate text-base font-medium text-foreground">
                      {item.fileName}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {item.mimeType}
                    </span>
                    {item.extractionStatus === "error" && item.errorMessage && (
                      <span className="truncate text-xs text-destructive">
                        {item.errorMessage}
                      </span>
                    )}
                  </div>
                  <span
                    className={`inline-flex shrink-0 items-center gap-1 text-xs font-medium ${status.className}`}
                  >
                    <status.icon
                      className={`size-3.5 ${item.extractionStatus === "pending" ? "animate-spin" : ""}`}
                    />
                    {status.label}
                  </span>
                  {isViewable && (
                    <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" />
                  )}
                </>
              );

              const rowClassName =
                "flex w-full items-center gap-3 rounded-lg border border-border bg-background p-3 text-left transition-colors" +
                (isViewable ? " hover:border-primary/40 hover:bg-accent/40" : "");

              if (isViewable && isImage) {
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setPreviewItem(item)}
                    className={`${rowClassName} cursor-pointer`}
                  >
                    {rowContent}
                  </button>
                );
              }

              if (isViewable) {
                return (
                  <a
                    key={item.id}
                    href={item.fileUrl!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${rowClassName} cursor-pointer`}
                  >
                    {rowContent}
                  </a>
                );
              }

              return (
                <div key={item.id} className={rowClassName}>
                  {rowContent}
                </div>
              );
            })}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={previewItem !== null} onOpenChange={(open) => !open && setPreviewItem(null)}>
        <DialogContent className="max-w-3xl gap-0 overflow-hidden p-0 sm:max-w-3xl">
          <DialogTitle className="sr-only">{previewItem?.fileName}</DialogTitle>
          {previewItem?.fileUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewItem.fileUrl}
              alt={previewItem.fileName}
              className="max-h-[75vh] w-full bg-black/5 object-contain"
            />
          )}
          <div className="flex items-center justify-between gap-3 border-t border-border p-3">
            <span className="truncate text-sm text-foreground">{previewItem?.fileName}</span>
            {previewItem?.fileUrl && (
              <a
                href={previewItem.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                Open original
                <ExternalLink className="size-3.5" />
              </a>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
