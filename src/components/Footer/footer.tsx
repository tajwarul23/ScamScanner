import Link from "next/link";
import { Search } from "lucide-react";

const productLinks = [
  { href: "#how", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#feed", label: "Public feed" },
];

const accountLinks = [
  { href: "/login", label: "Log in" },
  { href: "/signup", label: "Get started" },
];

const Footer = () => {
  
    return (
    <footer className="py-14 pb-10">
      <div className="mx-auto max-w-295 px-6 md:px-12">
        <div className="flex flex-wrap justify-between gap-10">
          <div className="flex max-w-70 flex-col gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <Search className="size-3.5" strokeWidth={2} />
              </span>
              <span className="font-serif text-[15.5px] font-semibold">
                Scam Scanner
              </span>
            </div>
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              AI-assisted scam investigation, built to protect, not to accuse.
            </p>
          </div>

          <div className="flex flex-wrap gap-16">
            <div className="flex flex-col gap-2.5">
              <p className="font-mono text-[11.5px] uppercase tracking-[0.06em] text-muted-foreground">
                Product
              </p>
              {productLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-[13.5px] text-muted-foreground hover:text-foreground"
                >
                  {link.label}
                </a>
              ))}
            </div>

            <div className="flex flex-col gap-2.5">
              <p className="font-mono text-[11.5px] uppercase tracking-[0.06em] text-muted-foreground">
                Account
              </p>
              {accountLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-[13.5px] text-muted-foreground hover:text-foreground"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        
      </div>
    </footer>
  );
  
}

export default Footer