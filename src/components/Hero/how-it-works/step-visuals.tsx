import type { ReactNode } from "react";
import {
  Check,
  FileText,
  ImageIcon,
  MessageSquareText,
  TriangleAlert,
  X,
} from "lucide-react";

const VisualFrame = ({ children }: { children: ReactNode }) => (
  <div className="h-44 overflow-hidden rounded-xl border border-border bg-card p-4 shadow-[0_1px_2px_rgba(20,24,30,0.04),0_12px_24px_-16px_rgba(20,24,30,0.18)]">
    {children}
  </div>
);

const files = [
  { icon: ImageIcon, name: "screenshot.png" },
  { icon: MessageSquareText, name: "chat.txt" },
  { icon: FileText, name: "offer.pdf" },
];

export const UploadVisual = () => (
  <VisualFrame>
    <div className="flex h-full flex-col gap-1.5 rounded-lg border border-dashed border-border p-2.5">
      {files.map((file) => (
        <div
          key={file.name}
          className="flex items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1.5"
        >
          <file.icon className="size-3.5 shrink-0 text-primary" strokeWidth={1.8} />
          <span className="truncate font-mono text-[11px] text-foreground">
            {file.name}
          </span>
        </div>
      ))}
      <p className="mt-auto font-mono text-[10.5px] text-muted-foreground">
        3 files · ready
      </p>
    </div>
  </VisualFrame>
);

const Highlight = ({ children }: { children: ReactNode }) => (
  <span className="rounded-sm bg-accent px-0.5 font-medium text-primary">
    {children}
  </span>
);

const entityTags = ["AMOUNT", "PAYEE", "DEADLINE"];

export const AnalysisVisual = () => (
  <VisualFrame>
    <div className="flex h-full flex-col gap-3">
      <p className="rounded-lg rounded-tl-sm bg-muted px-3 py-2.5 text-[12.5px] leading-relaxed text-foreground">
        Send <Highlight>৳5,000</Highlight> to{" "}
        <Highlight>Rahim Traders</Highlight> <Highlight>today</Highlight> to
        confirm your job.
      </p>
      <div className="mt-auto flex flex-wrap gap-1.5">
        {entityTags.map((tag) => (
          <span
            key={tag}
            className="rounded-md border border-border px-1.5 py-0.5 font-mono text-[10px] tracking-wide text-primary"
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  </VisualFrame>
);

const flags = [
  { level: "high", text: "Upfront fee requested" },
  { level: "med", text: "Payee ≠ company name" },
  { level: "high", text: "New domain (3 days)" },
] as const;

export const PatternVisual = () => (
  <VisualFrame>
    <div className="flex h-full flex-col gap-2.5">
      <p className="font-mono text-[10.5px] uppercase tracking-[0.09em] text-muted-foreground">
        3 red flags
      </p>
      {flags.map((flag) => (
        <div key={flag.text} className="flex items-center gap-2">
          <span
            className={`flex size-4.5 shrink-0 items-center justify-center rounded-md ${
              flag.level === "high"
                ? "bg-risk-high-bg text-risk-high"
                : "bg-risk-med-bg text-risk-med"
            }`}
          >
            {flag.level === "high" ? (
              <X className="size-3" strokeWidth={2.4} />
            ) : (
              <TriangleAlert className="size-2.5" strokeWidth={2.4} />
            )}
          </span>
          <span className="truncate text-[12.5px] text-foreground">
            {flag.text}
          </span>
        </div>
      ))}
    </div>
  </VisualFrame>
);

// Same three levels and colors as the case page (CaseDetailClient riskStyles)
const riskLevels = [
  { label: "LOW", active: false, className: "bg-risk-low-bg text-risk-low" },
  { label: "MEDIUM", active: false, className: "bg-risk-med-bg text-risk-med" },
  { label: "HIGH", active: true, className: "bg-risk-high-bg text-risk-high" },
];

export const VerdictVisual = () => (
  <VisualFrame>
    <div className="flex h-full flex-col gap-3">
      <div className="grid grid-cols-3 gap-1">
        {riskLevels.map((level) => (
          <span
            key={level.label}
            className={`rounded-md py-1 text-center font-mono text-[9.5px] font-medium tracking-wide ${
              level.active
                ? level.className
                : "bg-muted text-muted-foreground/60"
            }`}
          >
            {level.label}
          </span>
        ))}
      </div>
      <div className="flex items-start gap-2 rounded-md border-l-4 border-risk-high bg-risk-high-bg px-2.5 py-2 text-risk-high">
        <TriangleAlert className="mt-px size-3.5 shrink-0" strokeWidth={1.8} />
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="font-mono text-[11px] font-bold uppercase tracking-wide">
            High risk
          </span>
          <span className="text-[11px] leading-snug text-foreground">
            Multiple strong warning signs.
          </span>
        </div>
      </div>
      <div className="mt-auto flex items-center gap-2">
        <span className="flex size-4.5 shrink-0 items-center justify-center rounded-md bg-accent text-primary">
          <Check className="size-3" strokeWidth={2.4} />
        </span>
        <span className="text-[12.5px] text-muted-foreground">
          4 things to verify
        </span>
      </div>
    </div>
  </VisualFrame>
);
