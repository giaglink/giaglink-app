"use client";

import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useLoading } from "@/contexts/loading-context";

import { DashboardSidebar } from "../../components/dashboard/sidebar";
import { SidebarProvider } from "../../components/ui/sidebar";
import { DashboardHeader } from "../../components/dashboard/header";
import { Skeleton } from "../../components/ui/skeleton";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, loading] = useAuthState(auth);
  const router = useRouter();
  const { setIsLoading } = useLoading();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) {
      setIsLoading(true);
      return;
    }
    if (!user) {
      // If loading is finished and there's no user, redirect to login.
      router.push('/');
    } else {
      setIsLoading(false);
    }
  }, [user, loading, router, setIsLoading]);

  // Also turn off loading when the page changes
  useEffect(() => {
    setIsLoading(false);
  }, [pathname, setIsLoading]);
  
  if (loading) {
    // Return null because the global loading overlay is active
    return null;
  }
  
  if (!user) {
      // Return null or a simple message while redirecting
      return null;
  }
  
  return (
    <div className="bg-background">
        <SidebarProvider>
            <div className="flex min-h-screen">
                <DashboardSidebar />
                <main className="flex-1 flex flex-col h-screen overflow-y-auto">
                    <DashboardHeader />
                    {children}
                </main>
            </div>
        </SidebarProvider>
    </div>
  );
}

