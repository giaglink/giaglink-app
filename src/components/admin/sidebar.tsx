"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Users, Wallet, TrendingDown, LogOut, ShieldAlert, UserSquare, Wrench } from "lucide-react";
import { signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { useLoading } from "@/contexts/loading-context";

const menuItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/investments", label: "Investments", icon: Wallet },
  { href: "/admin/withdrawals", label: "Withdrawals", icon: TrendingDown },
  { href: "/admin/tools", label: "Tools", icon: Wrench },
  { href: "/dashboard", label: "User View", icon: UserSquare },
];

export function AdminSidebar({ uid }: { uid: string }) {
  const pathname = usePathname();
  const [userData, setUserData] = useState<{ fullName: string, email: string } | null>(null);
  const { setIsLoading } = useLoading();

  useEffect(() => {
    async function fetchUserData() {
        if (uid) {
            const userDocRef = doc(db, "users", uid);
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
                setUserData(userDoc.data() as { fullName: string, email: string });
            }
        }
    }
    fetchUserData();
  }, [uid]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      // Use window.location.href to ensure a full page reload to clear all state
      window.location.href = '/'; 
    } catch (error) {
        console.error("Failed to sign out", error);
    }
  };
  
  const getInitials = (name: string | undefined) => {
    if (!name) return "A";
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  }

  const handleLinkClick = (href: string) => (e: React.MouseEvent) => {
    if (pathname !== href) {
        setIsLoading(true);
    }
  };


  return (
      <Sidebar collapsible="icon">
        <SidebarHeader>
            <Logo href="/admin" />
        </SidebarHeader>
        <SidebarContent>
            <div className="p-2">
                <div className="p-2 flex items-center gap-2 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive">
                    <ShieldAlert className="h-5 w-5" />
                    <span className="font-semibold text-sm">Admin Mode</span>
                </div>
            </div>
            <SidebarMenu>
                {menuItems.map((item, index) => (
                    <React.Fragment key={item.href}>
                    {item.label === 'User View' && <Separator className="my-2" />}
                    <SidebarMenuItem>
                        <SidebarMenuButton
                          asChild
                          isActive={pathname === item.href}
                          tooltip={item.label}
                          onClick={handleLinkClick(item.href)}
                        >
                          <Link href={item.href}>
                            <item.icon />
                            <span>{item.label}</span>
                          </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    </React.Fragment>
                ))}
            </SidebarMenu>
        </SidebarContent>
        <Separator />
        <SidebarFooter>
            <div className="flex items-center gap-3 p-2">
                <Avatar>
                    <AvatarImage src="https://placehold.co/40x40.png" alt={userData?.fullName || 'User'} data-ai-hint="male portrait" />
                    <AvatarFallback>{getInitials(userData?.fullName)}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col overflow-hidden">
                    <span className="font-semibold text-sm truncate">{userData?.fullName || 'Admin'}</span>
                    <span className="text-xs text-muted-foreground truncate">{userData?.email || 'admin@example.com'}</span>
                </div>
                <Button variant="ghost" size="icon" className="ml-auto" onClick={handleLogout}>
                    <LogOut className="h-4 w-4" />
                </Button>
            </div>
        </SidebarFooter>
      </Sidebar>
  );
}
