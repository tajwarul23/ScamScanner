"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const navLinks = [
  { href: "#how", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#feed", label: "Public feed" },
];

const Header = () => {
  const [open, setOpen] = useState(false);

  return (
    <header className="h-19 border-b border-border">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-6 md:px-12">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Search className="size-4.5" strokeWidth={1.9} />
          </span>
          <span className="font-serif text-lg font-semibold">
            Scam Case Investigator
          </span>
        </div>

        <nav className="hidden items-center gap-9 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-4.5 md:flex">
          <Link href="/login" className="text-sm font-semibold text-foreground">
            Log in
          </Link>
          <Button asChild className="px-5">
            <Link href="/signup">Get started</Link>
          </Button>
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="flex flex-col items-center gap-6 pt-10">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="text-base font-medium text-foreground"
              >
                {link.label}
              </a>
            ))}
            <div className="mt-4 flex flex-col gap-3 border-t border-border pt-6">
              <Link href="/login" onClick={() => setOpen(false)} className="text-sm font-semibold">
                Log in
              </Link>
              <Button asChild className="w-full">
                <Link href="/signup">Get started</Link>
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
};

export default Header;
