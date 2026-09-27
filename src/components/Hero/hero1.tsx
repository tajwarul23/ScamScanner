import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
const verifySteps = [
  "Confirm the company's RJSC registration",
  "Check if this phone number appears in other reports",
];
const Hero1 = () => {
  return (
     <section className="py-24 md:py-24">
        <div className="mx-auto grid max-w-[1180px] items-center gap-16 px-6 md:grid-cols-2 md:px-12">
          <div className="flex max-w-[520px] flex-col gap-5">
           
            <h1 className="type-display">
              Know it&apos;s a scam{" "}
              <span className="text-primary">before it costs you anything.</span>
            </h1>
            <p className="text-base leading-[1.65] text-muted-foreground md:text-[17px]">
              Upload the screenshots, messages, or documents you&apos;re unsure
              about. Scam Case Investigator reads them, cross-checks them
              against known scam patterns, and tells you exactly what&apos;s
              wrong — and what to verify next.
            </p>
            <div className="mt-1.5 flex flex-wrap gap-3">
              <Button asChild size="lg" className="h-auto px-5 py-3.5 text-[15px]">
                <Link href="/case/create">
                  Start a free investigation
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-auto bg-card px-5 py-3.5 text-[15px]">
                <a href="#how">See how it works</a>
              </Button>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-5 top-5 -left-5 rounded-2xl bg-accent" aria-hidden />
            <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(20,24,30,0.05),0_24px_48px_-24px_rgba(20,24,30,0.22)]">
              <div className="flex items-center gap-1.5 border-b border-border px-4.5 py-3.5">
                <span className="size-2 rounded-full bg-border" />
                <span className="size-2 rounded-full bg-border" />
                <span className="size-2 rounded-full bg-border" />
              </div>
              <div className="flex flex-col gap-4.5 px-6 pt-6.5 pb-6">
                <div className="flex items-center justify-between">
                  <span className="type-data text-xs text-muted-foreground">
                    Case #0412
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-risk-high px-2.5 py-1 text-xs font-bold text-white">
                    <span className="size-1.5 rounded-full bg-white" />
                    High risk
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-foreground">
                  This message requests an upfront &quot;equipment fee&quot;
                  before any job begins — a pattern seen in advance-fee job
                  scams.
                </p>
                <div className="h-px bg-border" />
                <div className="flex flex-col gap-2.5">
                  <p className="type-label text-muted-foreground">
                    What to verify next
                  </p>
                  {verifySteps.map((step) => (
                    <div key={step} className="flex items-start gap-2">
                      <span className="mt-0.5 flex size-4.5 shrink-0 items-center justify-center rounded-md bg-accent text-primary">
                        <Check className="size-3" strokeWidth={2.4} />
                      </span>
                      <span className="text-[13.5px] text-muted-foreground">
                        {step}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
  )
}

export default Hero1