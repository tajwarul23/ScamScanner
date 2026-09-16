"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Menu, LogOutIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { usePathname, useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Skeleton } from "../ui/skeleton";
import { toast } from "sonner";

const navLinks = [
  
  { href: "/case/create", label: "Investigate" },
  { href: "/reports", label: "Your Reports" },
  { href: "/feed", label: "Browse Feed" },
];

const HIDDEN_ROUTES = ["/login"];

const Header = () => {
  const router = useRouter();
  const pathName = usePathname();
  const [isLogoutLoading, setIsLogoutLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { data: session, isPending } = authClient.useSession();
  if (HIDDEN_ROUTES.includes(pathName)) {
    return null;
  }

  // console.log(session?.user?.image);
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
      toast("Logged Out Successfully", { position: "top-right" });
      router.refresh();
      router.push("/");
    } catch (err) {
      console.log("Error in logout", err);
      toast("Failed to logout", { position: "top-right" });
      setIsLogoutLoading(false);
    } finally {
      setIsLogoutLoading(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 h-19 border-b border-border bg-background">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-6 md:px-12">
        <div>
          <Link href={"/"} className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Search className="size-4.5" strokeWidth={1.9} />
            </span>
            <span className="font-serif text-lg font-semibold">
              Scam Scanner
            </span>
          </Link>
        </div>

        

        <div className="hidden items-center gap-4.5 md:flex">
          {isPending ? (
            <Skeleton className="size-8 rounded-full bg-gray-600" />
          ) : session ? (
            <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
              <DropdownMenuTrigger asChild className="cursor-pointer">
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar className="size-10 ">
                    <AvatarImage
                      src={session?.user?.image ?? undefined}
                      alt={session?.user?.name ?? "Account"}
                      referrerPolicy="no-referrer"
                    />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {session.user.name?.[0]?.toUpperCase() ?? "U"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="mt-2">
                <DropdownMenuGroup>

                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link href={"/case/create"}>Investigate</Link>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>

                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link href={"/feed"}>Browse Feed</Link>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>

                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link href={"/reports"}>Your Reports</Link>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  disabled={isLogoutLoading}
                  onSelect={async (event) => {
                    event.preventDefault();
                    await handleLogout();
                    setMenuOpen(false);
                  }}
                  className="cursor-pointer"
                >
                  <LogOutIcon />
                  {isLogoutLoading ? "Logging out..." : "Logout"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild className="px-5">
              <Link href="/login">Log in</Link>
            </Button>
          )}
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="right"
            className="flex flex-col items-center gap-6 pt-10"
          >
            {session &&
              navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground border-b-2 border-transparent hover:border-foreground"
                >
                  {link.label}
                </a>
              ))}
            <div className="mt-4 flex flex-col gap-3  pt-6">
              {isPending ? (
                <Skeleton className="h-8 w-full rounded-md" />
              ) : session ? (
                <>
                 
                  <Button
                    variant="destructive"
                    className="w-full"
                    disabled={isLogoutLoading}
                    onClick={async () => {
                      await handleLogout();
                      setOpen(false);
                    }}
                  >
                    <LogOutIcon />
                    {isLogoutLoading ? "Logging out..." : "Logout"}
                  </Button>
                </>
              ) : (
                <Button
                  asChild
                  className="w-full"
                  onClick={() => setOpen(false)}
                >
                  <Link href="/login">Login</Link>
                </Button>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
};

export default Header;
