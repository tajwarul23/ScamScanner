import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono, Noto_Sans_Bengali } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/header";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "Scam Scanner",
  description: "An AI based scam case investigator",
};
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
});
// fallback for ৳ and Bengali text, which the Latin fonts don't include
const notoBengali = Noto_Sans_Bengali({
  subsets: ["bengali"],
  variable: "--font-bengali",
});

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={cn(
        jakarta.variable,
        jetbrainsMono.variable,
        notoBengali.variable,
        "font-sans scroll-smooth",
      )}
    >
      <body className="min-h-full flex flex-col">
        <Header />
        {children}
        <Toaster/>
      </body>
    </html>
  );
}
