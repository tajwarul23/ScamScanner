"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Menu, LogOutIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { usePathname, useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Skeleton } from "../ui/skeleton";
import { toast } from "sonner";

const navLinks = [
  { href: "/reports", label: "Your Reports" },
  { href: "/case/create", label: "Investigate" },
];

const HIDDEN_ROUTES = ["/login"];

const Header = () => {
  const router = useRouter();
  const pathname = usePathname();

  const [isLogoutLoading, setIsLogoutLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const { data: session, isPending } = authClient.useSession();

  if (HIDDEN_ROUTES.includes(pathname)) {
    return null;
  }

  const handleLogout = async () => {
    setIsLogoutLoading(true);

    try {
      const { error } = await authClient.signOut();

      if (error) {
        toast.error(error.message || "Failed to logout", {
          position: "top-right",
        });
        return;
      }

      setOpen(false);
      router.push("/");
      router.refresh();

      toast.success("Logged out successfully", {
        position: "top-right",
      });
    } catch (error) {
      console.error("Error in logout:", error);

      toast.error("Failed to logout", {
        position: "top-right",
      });
    } finally {
      setIsLogoutLoading(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 h-19 border-b border-border bg-background">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-6 md:px-12">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Search className="size-4.5" strokeWidth={1.9} />
          </span>

          <span className="font-serif text-lg font-semibold">
            Scam Scanner
          </span>
        </Link>

        {/* Right side */}
        {isPending ? (
          <Skeleton className="size-9 rounded-md" />
        ) : session ? (
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="cursor-pointer"
                aria-label="Open menu"
              >
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>

            <SheetContent
              side="right"
              className="flex flex-col gap-6 px-4 pt-10 pb-6"
            >
              <SheetTitle className="sr-only">
                Navigation menu
              </SheetTitle>

              {/* User */}
              <div className="flex items-center gap-3 border-b border-border pb-4">
                <Avatar className="size-11">
                  <AvatarImage
                    src={session.user.image ?? undefined}
                    alt={session.user.name ?? "Account"}
                    referrerPolicy="no-referrer"
                  />

                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {session.user.name?.[0]?.toUpperCase() ?? "U"}
                  </AvatarFallback>
                </Avatar>

                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium text-foreground">
                    {session.user.name}
                  </span>

                  <span className="truncate text-xs text-muted-foreground">
                    {session.user.email}
                  </span>
                </div>
              </div>

              {/* Navigation */}
              <nav className="flex flex-col gap-1">
                {navLinks.map((link) => {
                  const isActive =
                    pathname === link.href ||
                    pathname.startsWith(`${link.href}/`);

                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setOpen(false)}
                      className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-accent text-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      }`}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </nav>

              {/* Logout */}
              <div className="mt-auto">
                <Button
                  variant="destructive"
                  className="w-full cursor-pointer"
                  disabled={isLogoutLoading}
                  onClick={handleLogout}
                >
                  <LogOutIcon />

                  {isLogoutLoading
                    ? "Logging out..."
                    : "Logout"}
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        ) : (
          <Button asChild className="cursor-pointer">
            <Link href="/login">Login</Link>
          </Button>
        )}
      </div>
    </header>
  );
};

export default Header;