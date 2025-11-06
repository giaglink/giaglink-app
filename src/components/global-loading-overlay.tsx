"use client";

import { useLoading } from "@/contexts/loading-context";
import { Loader2 } from "lucide-react";

export function GlobalLoadingOverlay() {
  const { isLoading } = useLoading();

  if (!isLoading) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-lg font-medium text-foreground">Loading...</p>
      </div>
    </div>
  );
}
