import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const Cta = () => {
  return (
    <section className="bg-accent-dark py-22">
      <div className="mx-auto flex max-w-[1180px] flex-col items-center gap-5 px-6 text-center md:px-12">
        <h2 className="font-serif text-[34px] leading-[1.2] text-primary-foreground">
          Don&apos;t guess. Investigate.
        </h2>
        <p className="max-w-[460px] text-base text-[oklch(88%_0.02_258)]">
          Start your first case free — no credit card, no commitment.
        </p>
        <Button
          asChild
          size="lg"
          className="mt-1.5 h-auto bg-primary-foreground px-5 py-3.5 text-[15px] text-accent-dark hover:bg-primary-foreground/90"
        >
          <Link href="/signup">
            Get started
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>
    </section>
  );
};

export default Cta;
