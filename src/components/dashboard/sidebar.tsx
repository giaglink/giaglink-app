"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Wallet, Settings, LogOut, TrendingDown, ShieldCheck } from "lucide-react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useLoading } from "@/contexts/loading-context";

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

interface UserData {
    fullName: string;
    email: string;
    isAdmin?: boolean;
}

const menuItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/portfolio", label: "Portfolio", icon: Wallet },
  { href: "/dashboard/withdrawal", label: "Withdrawal", icon: TrendingDown },
  { href: "/dashboard/settings", label: "My Account", icon: Settings },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const { setIsLoading } = useLoading();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userDocRef = doc(db, "users", currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          setUserData(userDoc.data() as UserData);
        }
      } else {
        setUserData(null);
        // Redirect to login if user logs out
        window.location.href = '/';
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
  };
  
  const getInitials = (name: string | undefined) => {
    if (!name) return "U";
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
            <Logo href="/dashboard" />
        </SidebarHeader>
        <SidebarContent className="flex flex-col">
            <SidebarMenu className="flex-1">
            {menuItems.map((item) => (
                <SidebarMenuItem key={item.href}>
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
            ))}
            
             {userData?.isAdmin && (
                <>
                <Separator className="my-2" />
                <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname.startsWith('/admin')}
                      tooltip={"Admin Panel"}
                      className="bg-destructive/10 text-destructive hover:bg-destructive/20 hover:text-destructive"
                      onClick={handleLinkClick('/admin')}
                    >
                      <Link href="/admin">
                        <ShieldCheck />
                        <span>Admin Panel</span>
                      </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                </>
            )}
            </SidebarMenu>
            
            <div>
                <Separator />
                <div className="flex items-center gap-3 p-2">
                    <Avatar>
                        <AvatarImage src="https://placehold.co/40x40.png" alt={userData?.fullName || 'User'} data-ai-hint="male portrait" />
                        <AvatarFallback>{getInitials(userData?.fullName)}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col overflow-hidden">
                        <span className="font-semibold text-sm truncate">{userData?.fullName || 'User'}</span>
                        <span className="text-xs text-muted-foreground truncate">{userData?.email || 'user@example.com'}</span>
                    </div>
                    <Button variant="ghost" size="icon" className="ml-auto" onClick={handleLogout}>
                        <LogOut className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </SidebarContent>
    </Sidebar>
  );
}
