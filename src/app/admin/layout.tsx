"use client";

import type { ReactNode } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AdminSidebar } from "@/components/admin/sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminHeader } from "@/components/admin/header";
import { AdminNav } from "@/components/admin/nav";
import { useLoading } from "@/contexts/loading-context";

interface UserData {
    isAdmin?: boolean;
}

function getTitleFromPathname(pathname: string) {
    if (pathname === '/admin') return 'Dashboard';
    const segment = pathname.split('/').pop()?.replace('-', ' ');
    if (!segment) return 'Dashboard';
    // Capitalize first letter of each word
    return segment.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}


function AdminAuthGuard({ children }: { children: ReactNode }) {
    const router = useRouter();
    const [user, loading] = useAuthState(auth);
    const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
    const { setIsLoading } = useLoading();

    useEffect(() => {
        const checkAdminStatus = async () => {
            if (loading) {
                setIsLoading(true);
                return;
            }
            if (!user) {
                router.replace("/");
                setIsLoading(false);
                return;
            }

            try {
                const userDocRef = doc(db, "users", user.uid);
                const userDoc = await getDoc(userDocRef);
                const userData = userDoc.data() as UserData;

                if (userData?.isAdmin) {
                    setIsAdmin(true);
                } else {
                    setIsAdmin(false);
                    router.replace("/dashboard");
                }
            } catch (error) {
                console.error("Error checking admin status:", error);
                setIsAdmin(false);
                router.replace("/dashboard");
            } finally {
                setIsLoading(false);
            }
        };

        checkAdminStatus();
    }, [user, loading, router, setIsLoading]);
    
    if (loading || isAdmin === null) {
        // The global loading overlay will be shown via the useEffect
        return null;
    }
    
    if (!isAdmin) {
        // This will be shown briefly before the redirect to /dashboard happens
        return (
             <div className="flex h-screen w-full items-center justify-center">
                <p>You are not authorized to view this page. Redirecting...</p>
            </div>
        );
    }

    return <>{children}</>;
}


export default function AdminLayout({ children }: { children: ReactNode }) {
  const [user] = useAuthState(auth);
  const pathname = usePathname();
  const title = getTitleFromPathname(pathname);
  const { setIsLoading } = useLoading();

  useEffect(() => {
      setIsLoading(false);
  }, [pathname, setIsLoading]);


  return (
    <div className="bg-background">
        <SidebarProvider>
        <AdminAuthGuard>
            <div className="flex min-h-screen">
            {user && <AdminSidebar uid={user.uid} />}
            <main className="flex-1 flex flex-col h-screen overflow-y-auto">
                <AdminHeader title={title} />
                <AdminNav />
                {children}
            </main>
            </div>
        </AdminAuthGuard>
        </SidebarProvider>
    </div>
  );
}
