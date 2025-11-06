"use client";

import { LoadingProvider } from '@/contexts/loading-context';
import { GlobalLoadingOverlay } from '@/components/global-loading-overlay';
import { Toaster } from "@/components/ui/toaster";

export function ClientRoot({
    children,
  }: Readonly<{
    children: React.ReactNode;
  }>) {
    return (
        <LoadingProvider>
            <GlobalLoadingOverlay />
            {children}
            <Toaster />
        </LoadingProvider>
    );
}
