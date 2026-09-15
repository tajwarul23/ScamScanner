import { Eye, ShieldCheck, Flag, BadgeCheck, ListChecks, FolderOpen } from "lucide-react";

const features = [
  {
    icon: Eye,
    title: "Reads screenshots and text together",
    description: "No separate OCR step — one AI reads both at once.",
  },
  {
    icon: ShieldCheck,
    title: "Automatic entity extraction",
    description: "Names, companies, amounts, and dates, pulled out for you.",
  },
  {
    icon: Flag,
    title: "Contradiction detection",
    description: "Catches mismatched dates, amounts, or names across messages.",
  },
  {
    icon: BadgeCheck,
    title: "Explained risk scoring",
    description: "Low, Medium, or High — always with the reasoning shown.",
  },
  {
    icon: ListChecks,
    title: "Personalized next steps",
    description: "A verification checklist built from your case, not generic advice.",
  },
  {
    icon: FolderOpen,
    title: "History, export, and sharing",
    description: "Keep every case, export a PDF report, or share a private link.",
  },
];

const WhatsInside = () => {
  return (
    <section id="features" className="py-22 scroll-mt-19">
      <div className="mx-auto max-w-295 px-6 md:px-12">
        <div className="mb-12 max-w-145">
          <p className="font-mono text-xs uppercase tracking-[0.09em] text-primary">
            What&apos;s inside
          </p>
          <h2 className="mt-3.5 font-serif text-[32px] font-semibold leading-[1.2]">
            Everything you need to check a suspicious case, in one place.
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-5.5 sm:grid-cols-2 md:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="flex flex-col gap-3 rounded-[10px] border border-border bg-card p-6.5"
            >
              <div className="flex size-10 items-center justify-center rounded-lg bg-accent text-primary">
                <feature.icon className="size-5" strokeWidth={1.6} />
              </div>
              <h3 className="font-serif text-base font-semibold">
                {feature.title}
              </h3>
              <p className="text-[13.5px] leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhatsInside;
