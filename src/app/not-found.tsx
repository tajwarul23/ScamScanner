import Link from "next/link";
import { SearchX, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-5 px-6 py-24 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-accent text-primary">
        <SearchX className="size-7" strokeWidth={1.6} />
      </span>
      <p className="font-mono text-xs uppercase tracking-[0.09em] text-primary">
        Error 404
      </p>
      <h1 className="font-serif text-[32px] font-semibold leading-[1.2] md:text-[40px]">
        This page didn&apos;t check out.
      </h1>
      <p className="max-w-[440px] text-[15px] leading-relaxed text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist, was moved, or
        never existed in the first place. 
      </p>
      <Button asChild size="lg" className="mt-2 h-auto px-5 py-3.5 text-[15px]">
        <Link href="/">
          <ArrowLeft className="size-4" />
          Back to home
        </Link>
      </Button>
    </main>
  );
}
