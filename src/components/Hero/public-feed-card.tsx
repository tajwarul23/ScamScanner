import { ArrowRight } from "lucide-react";
import { Button } from "../ui/button";
import Link from "next/link";

const entries = [
  {
    risk: "high" as const,
    title: 'Fake job offer requiring an upfront "equipment fee"',
    flagged: "Flagged 12 times",
  },
  {
    risk: "high" as const,
    title: 'Romance scam requesting gift cards for "customs fees"',
    flagged: "Flagged 8 times",
  },
  {
    risk: "medium" as const,
    title: "Investment scheme promising guaranteed weekly returns",
    flagged: "Flagged 5 times",
  },
];

const riskStyles = {
  high: "bg-risk-high-bg text-risk-high",
  medium: "bg-risk-med-bg text-risk-med",
};

const PublicFeedCard = () => {
  return (
    <section
      id="feed"
      className="scroll-mt-[76px] border-y border-border bg-muted py-22"
    >
      <div className="mx-auto max-w-[1180px] px-6 md:px-12">
        <div className="mb-11 max-w-[640px]">
          <p className="font-mono text-xs uppercase tracking-[0.09em] text-primary">
            Public scam feed
          </p>
          <h2 className="mt-3.5 font-serif text-[32px] font-semibold leading-[1.2]">
            See what other people are flagging — never who.
          </h2>
          <p className="mt-3.5 text-[15px] leading-relaxed text-muted-foreground">
            Every high-risk case is automatically stripped of names, companies,
            numbers, and links before it reaches the feed. Only the scam
            technique is ever shared.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3">
          {entries.map((entry) => (
            <div
              key={entry.title}
              className="flex flex-col gap-3 rounded-[10px] border border-border bg-card p-6.5"
            >
              <span
                className={`inline-flex w-fit items-center rounded-md px-2.5 py-1 font-mono text-[11px] font-medium tracking-wide ${riskStyles[entry.risk]}`}
              >
                {entry.risk === "high" ? "HIGH RISK" : "MEDIUM RISK"}
              </span>
              <h3 className="text-[15.5px] font-semibold leading-snug">
                {entry.title}
              </h3>
              <p className="text-[13px] text-muted-foreground">
                {entry.flagged}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-7">
         <Button asChild size="lg" className="h-auto px-5 py-3.5 text-[15px]">
                <Link href="/signup">
                  Browse Feed
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
        </div>
      </div>
    </section>
  );
};

export default PublicFeedCard;
