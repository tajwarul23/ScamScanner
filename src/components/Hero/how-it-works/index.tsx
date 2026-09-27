import { Upload, Eye, ShieldCheck, BadgeCheck } from "lucide-react";
import {
  UploadVisual,
  AnalysisVisual,
  PatternVisual,
  VerdictVisual,
} from "./step-visuals";

const steps = [
  {
    icon: Upload,
    visual: UploadVisual,
    number: "STEP 01",
    title: "Upload your evidence",
    description:
      "Screenshots, chat exports, PDFs, or contracts. Add anything extra you remember, in your own words.",
  },
  {
    icon: Eye,
    visual: AnalysisVisual,
    number: "STEP 02",
    title: "Multimodal AI Analysis",
    description:
      "Reads text inside images and links names, amounts, and claims to where they appeared.",
  },
  {
    icon: ShieldCheck,
    visual: PatternVisual,
    number: "STEP 03",
    title: "Checked against real scam patterns",
    description:
      "Every case is compared against known scam techniques, and checked for contradictions, risky links.",
  },
  {
    icon: BadgeCheck,
    visual: VerdictVisual,
    number: "STEP 04",
    title: "Get a clear verdict",
    description:
      "A well calculated risk verdict, a plain-language explanation of why, and a checklist of exactly what to verify next.",
  },
];

const HowItWorks = () => {
  return (
    <section id="how" className="scroll-mt-19 border-y border-border bg-muted py-20">
      <div className="mx-auto max-w-295 px-6 md:px-12">
        <div className="mb-13 max-w-145">
          <p className="font-mono text-xs uppercase tracking-[0.09em] text-primary">
            How it works
          </p>
          <h2 className="mt-3.5 font-serif text-[32px] font-semibold leading-[1.2]">
            Four steps. No guesswork.
          </h2>
        </div>

        <div className="flex flex-col gap-12 lg:grid lg:grid-cols-4 lg:gap-8">
          {steps.map((step, index) => (
            <div key={step.number} className="relative flex gap-5 lg:flex-col lg:gap-5">
              {/* connector to the next step: vertical on mobile, horizontal on desktop */}
              {index < steps.length - 1 && (
                <div
                  aria-hidden
                  className="absolute left-5 top-12 -bottom-10 w-px bg-border lg:left-12 lg:-right-6 lg:top-5 lg:bottom-auto lg:h-px lg:w-auto"
                />
              )}

              <div className="relative z-10 flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
                <step.icon className="size-5" strokeWidth={1.6} />
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-3.5">
                <step.visual />
                <p className="mt-1.5 font-mono text-xs text-muted-foreground">
                  {step.number}
                </p>
                <h3 className="font-serif text-[17px] font-semibold">
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
