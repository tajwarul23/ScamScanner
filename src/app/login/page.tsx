"use client";
import Link from "next/link";
import { Loader2Icon, Search } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const { error } = await authClient.signIn.social({
        provider: "google",
        callbackURL: "/",
      });
      if (error) {
        toast.error("Login Failed", { position: "top-right" });
        setIsLoading(false);
      }
    } catch (err) {
      console.error("Error in login", err);
      toast.error("Something Went Wrong", { position: "top-right" });
      setIsLoading(false);
    }
  };
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-16 mt-16">
      <Link href="/" className="flex items-center gap-2.5">
        <span className="flex size-[30px] items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Search className="size-4" strokeWidth={2} />
        </span>
        <span className="font-serif text-base font-semibold">Scam Scanner</span>
      </Link>

      <div className="flex w-full max-w-[400px] flex-col gap-6.5 rounded-[10px] border border-border bg-card p-9">
        <div className="flex flex-col gap-2 text-center">
          <p className="font-mono text-[11.5px] uppercase tracking-[0.07em] text-primary">
            Sign in required
          </p>
          <h1 className="font-serif text-[21px] font-semibold">
            Sign in to continue
          </h1>
          <p className="text-[13.5px] leading-relaxed text-muted-foreground">
            Every case, upload, and feed entry is tied to your account —
            there&apos;s no anonymous access.
          </p>
        </div>

        <Button
          onClick={handleGoogleLogin}
          variant={"outline"}
          className="cursor-pointer"
        >
          <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden="true">
            <path
              fill="#EA4335"
              d="M24 9.5c3.4 0 6.4 1.17 8.8 3.46l6.55-6.55C35.05 2.5 29.9 0 24 0 14.62 0 6.5 5.38 2.56 13.22l7.6 5.9C12.05 13.3 17.55 9.5 24 9.5z"
            />
            <path
              fill="#4285F4"
              d="M46.5 24.5c0-1.64-.15-3.2-.42-4.7H24v9.02h12.65c-.55 2.9-2.2 5.36-4.7 7.02l7.3 5.66C43.6 37.4 46.5 31.5 46.5 24.5z"
            />
            <path
              fill="#FBBC05"
              d="M10.16 19.12A14.5 14.5 0 0 0 9.5 24c0 1.72.3 3.36.83 4.88l-7.6 5.9A23.9 23.9 0 0 1 0 24c0-3.87.93-7.52 2.56-10.78l7.6 5.9z"
            />
            <path
              fill="#34A853"
              d="M24 48c6.48 0 11.92-2.14 15.9-5.82l-7.3-5.66c-2.03 1.37-4.65 2.18-8.6 2.18-6.45 0-11.95-3.8-13.84-9.62l-7.6 5.9C6.5 42.62 14.62 48 24 48z"
            />
          </svg>
          {isLoading ? (
            <>
              <Loader2Icon className="size-4 animate-spin" />
              Signing in with Google
            </>
          ) : (
            "Sign in with Google"
          )}
        </Button>
      </div>
    </main>
  );
}
