import { Upload, Eye, ShieldCheck, BadgeCheck } from "lucide-react";

const steps = [
  {
    icon: Upload,
    number: "STEP 01",
    title: "Upload your evidence",
    description:
      "Screenshots, chat exports, PDFs, or contracts. Add anything extra you remember, in your own words.",
  },
  {
    icon: Eye,
    number: "STEP 02",
    title: "Multimodal AI Analysis",
    description:
      "A multimodal AI model processes visual and textual inputs simultaneously, allowing it to accurately correlate names, amounts, and claims with the context in which they were presented.",
  },
  {
    icon: ShieldCheck,
    number: "STEP 03",
    title: "Checked against real scam patterns",
    description:
      "Every case is compared against known scam techniques, and checked for contradictions, risky links, and reused phone numbers.",
  },
  {
    icon: BadgeCheck,
    number: "STEP 04",
    title: "Get a clear verdict",
    description:
      "A risk score, a plain-language explanation of why, and a checklist of exactly what to verify next.",
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

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-4">
          {steps.map((step) => (
            <div key={step.number} className="flex flex-col gap-3.5">
              <div className="flex size-10 items-center justify-center rounded-lg bg-accent text-primary">
                <step.icon className="size-5" strokeWidth={1.6} />
              </div>
              <p className="font-mono text-xs text-muted-foreground">
                {step.number}
              </p>
              <h3 className="font-serif text-[17px] font-semibold">
                {step.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
