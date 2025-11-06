"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Search, LogOut, ShieldCheck } from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase"; // Use client-side auth for logout
import { useEffect, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
  } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils";
import { Logo } from "../logo";

interface UserData {
    fullName: string;
    isAdmin?: boolean;
}

const navigation = [
    { name: "Home", href: "/dashboard" },
    { name: "Portfolio", href: "/dashboard/portfolio" },
    { name: "Withdrawal", href: "/dashboard/withdrawal" },
    { name: "My Account", href: "/dashboard/settings" },
]

function getTitleFromPathname(pathname: string) {
    if (pathname === '/dashboard') return 'Dashboard';
    const segment = pathname.split('/').pop()?.replace('-', ' ');
    if (!segment) return 'Dashboard';
    // Capitalize first letter of each word
    return segment.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

export function DashboardHeader() {
  const pathname = usePathname();
  const [user] = useAuthState(auth);
  const [userData, setUserData] = useState<UserData | null>(null);

  useEffect(() => {
    async function fetchUserData() {
        if (user) {
            const userDocRef = doc(db, "users", user.uid);
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
                setUserData(userDoc.data() as UserData);
            }
        }
    }
    fetchUserData();
  }, [user]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      // Force a full page reload to ensure all state is cleared and redirect
      window.location.href = '/'; 
    } catch (error) {
        console.error("Failed to sign out", error);
    }
  };

  const getInitials = (name: string | undefined) => {
    if (!name) return "U";
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  }


  return (
    <header className="sticky top-0 z-10 flex flex-col border-b bg-background/80 backdrop-blur-sm">
      <div className="flex h-16 shrink-0 items-center gap-4 px-4 sm:px-6">
        <div className="md:hidden">
            <SidebarTrigger />
        </div>
        <div className="flex-1 flex items-center gap-4">
            <Logo href="/dashboard" />
            <span className="text-muted-foreground">|</span>
            <h1 className="text-lg font-medium text-muted-foreground">{getTitleFromPathname(pathname)}</h1>
        </div>
        <div className="ml-auto flex items-center gap-2 md:gap-4">
            <div className="relative hidden lg:block">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
                type="search"
                placeholder="Search investments..."
                className="pl-8 sm:w-[200px] lg:w-[200px]"
            />
            </div>
            <Button variant="ghost" size="icon" className="rounded-full">
            <Bell className="h-5 w-5" />
            <span className="sr-only">Toggle notifications</span>
            </Button>
            <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar className="h-8 w-8">
                    <AvatarImage src="https://placehold.co/40x40.png" alt={userData?.fullName || 'User'} data-ai-hint="male portrait" />
                    <AvatarFallback>{getInitials(userData?.fullName)}</AvatarFallback>
                </Avatar>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild><Link href="/dashboard/settings">Profile</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link href="/dashboard/settings">Settings</Link></DropdownMenuItem>
                {userData?.isAdmin && (
                    <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                            <Link href="/admin" className="flex items-center text-destructive">
                                <ShieldCheck className="mr-2 h-4 w-4" />
                                <span>Admin Panel</span>
                            </Link>
                        </DropdownMenuItem>
                    </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Logout</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </div>
      <nav className="flex items-center gap-4 text-sm sm:gap-6 px-4 sm:px-6 pb-2">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "font-medium transition-colors hover:text-primary pb-1",
                  pathname === item.href ? "text-primary border-b-2 border-primary" : "text-muted-foreground"
                )}
              >
                {item.name}
              </Link>
            ))}
      </nav>
    </header>
  );
}
