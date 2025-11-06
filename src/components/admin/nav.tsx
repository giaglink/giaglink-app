"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"


const adminNavItems = [
    {
      title: "Dashboard",
      href: "/admin",
    },
    {
      title: "Users",
      href: "/admin/users",
    },
    {
      title: "Investments",
      href: "/admin/investments",
    },
    {
      title: "Withdrawals",
      href: "/admin/withdrawals",
    },
    {
      title: "Tools",
      href: "/admin/tools",
    },
]

export function AdminNav() {
  const pathname = usePathname()

  return (
    <nav className="border-b px-4 sm:px-6">
        <Tabs value={pathname} className="relative w-full">
            <TabsList>
                {adminNavItems.map((item) => (
                    <TabsTrigger key={item.href} value={item.href} asChild>
                         <Link href={item.href}>{item.title}</Link>
                    </TabsTrigger>
                ))}
            </TabsList>
        </Tabs>
    </nav>
  )
}
