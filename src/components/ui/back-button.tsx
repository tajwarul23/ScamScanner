"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BackButton() {
  const router = useRouter();

  return (
    <Button variant="ghost" size="sm" className="w-fit cursor-pointer" onClick={() => router.back()}>
      <ArrowLeft className="size-4" />
      Back
    </Button>
  );
}
