'use server';

import Link from 'next/link';
import { db } from '@/lib/firebase-admin';
import type { Timestamp } from 'firebase-admin/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Users, Wallet, TrendingDown, CheckCircle, UserPlus, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Currency } from "@/components/ui/currency";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { PerformanceChart } from '@/components/dashboard/performance-chart';

interface StatCardProps {
  title: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  isLoading?: boolean;
}

const StatCard = ({ title, value, icon, isLoading }: StatCardProps) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            {icon}
        </CardHeader>
        <CardContent>
            {isLoading ? (
                <Skeleton className="h-8 w-3/4" />
            ) : (
                <div className="text-2xl font-bold">{value}</div>
            )}
        </CardContent>
    </Card>
);

async function getStats() {
    try {
        const usersSnapshot = await db.collection("users").get();
        const totalUsers = usersSnapshot.size;

        const allStatsPromises = usersSnapshot.docs.map(async (userDoc) => {
            const userId = userDoc.id;
            
            const investmentsCol = db.collection(`users/${userId}/investments`);
            const withdrawalsCol = db.collection(`users/${userId}/withdrawals`);
            
            const [investmentsSnapshot, withdrawalsSnapshot] = await Promise.all([
                investmentsCol.get(),
                withdrawalsCol.get()
            ]);
            
            // Only include investments that are approved or don't have a status (legacy)
            const userTotalInvestment = investmentsSnapshot.docs
                .filter(doc => {
                    const status = doc.data().status;
                    return status === 'Approved' || status === undefined;
                })
                .reduce((acc, doc) => acc + (doc.data().amount || 0), 0);
            
            let userPendingWithdrawalsCount = 0;
            let userCompletedWithdrawalsCount = 0;
            let userTotalWithdrawals = 0;

            withdrawalsSnapshot.forEach(doc => {
                const data = doc.data();
                if (data.status === 'Pending') {
                    userPendingWithdrawalsCount++;
                } else if (data.status === 'Completed') {
                    userCompletedWithdrawalsCount++;
                    // Use payoutAmount for the total, as that's the final value
                    userTotalWithdrawals += data.payoutAmount || 0;
                }
            });

            return {
                userTotalInvestment,
                userPendingWithdrawalsCount,
                userCompletedWithdrawalsCount,
                userTotalWithdrawals,
            };
        });

        const allStats = await Promise.all(allStatsPromises);
        
        const totalInvestments = allStats.reduce((acc, stats) => acc + stats.userTotalInvestment, 0);
        const pendingWithdrawalsCount = allStats.reduce((acc, stats) => acc + stats.userPendingWithdrawalsCount, 0);
        const completedWithdrawalsCount = allStats.reduce((acc, stats) => acc + stats.userCompletedWithdrawalsCount, 0);
        const totalWithdrawals = allStats.reduce((acc, stats) => acc + stats.userTotalWithdrawals, 0);

        return {
          totalUsers,
          totalInvestments,
          pendingWithdrawalsCount,
          completedWithdrawalsCount,
          totalWithdrawals,
        };
      } catch (error) {
        console.error("Error fetching admin stats:", error);
        return {
          totalUsers: 0,
          totalInvestments: 0,
          pendingWithdrawalsCount: 0,
          completedWithdrawalsCount: 0,
          totalWithdrawals: 0,
        };
      }
}

type Activity = {
    type: 'signup' | 'investment' | 'withdrawal';
    user: { id: string; fullName: string; };
    details: string;
    amount?: number;
    timestamp: string; // Changed to string
}

async function getRecentActivities(): Promise<Activity[]> {
    const activities: Activity[] = [];
    
    try {
        const usersSnapshot = await db.collection('users').get();
        
        for (const userDoc of usersSnapshot.docs) {
            const userData = userDoc.data();
            const user = { id: userDoc.id, fullName: userData.fullName };

            // Add signup activity
            if (userData.createdAt) {
                activities.push({
                    type: 'signup',
                    user,
                    details: 'joined the platform',
                    timestamp: (userData.createdAt as Timestamp).toDate().toISOString(),
                });
            }

            // Add investment activities
            const investmentsSnapshot = await userDoc.ref.collection('investments').get();
            investmentsSnapshot.forEach(doc => {
                const data = doc.data();
                activities.push({
                    type: 'investment',
                    user,
                    details: `made an investment in ${data.investmentType}`,
                    amount: data.amount,
                    timestamp: (data.createdAt as Timestamp).toDate().toISOString(),
                });
            });

            // Add withdrawal activities
            const withdrawalsSnapshot = await userDoc.ref.collection('withdrawals').get();
            withdrawalsSnapshot.forEach(doc => {
                const data = doc.data();
                activities.push({
                    type: 'withdrawal',
                    user,
                    details: `requested a withdrawal`,
                    amount: data.amount,
                    timestamp: (data.createdAt as Timestamp).toDate().toISOString(),
                });
            });
        }
        
        // Sort all collected activities by timestamp descending
        activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        // Return the 5 most recent activities
        return activities.slice(0, 5);

    } catch (error) {
        console.error("Error fetching recent activities:", error);
        return [];
    }
}

const getInitials = (name: string | undefined) => {
    if (!name) return "?";
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
}

const timeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    return Math.floor(seconds) + " seconds ago";
};

const ActivityIcon = ({ type }: { type: Activity['type'] }) => {
    switch (type) {
        case 'signup': return <UserPlus className="h-4 w-4 text-blue-500" />;
        case 'investment': return <Wallet className="h-4 w-4 text-green-500" />;
        case 'withdrawal': return <TrendingDown className="h-4 w-4 text-red-500" />;
        default: return <UserPlus className="h-4 w-4" />;
    }
}


export default async function AdminDashboardPage() {
  const [stats, recentActivities] = await Promise.all([
    getStats(),
    getRecentActivities()
  ]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
            <StatCard
            title="Total Users"
            value={stats.totalUsers.toLocaleString()}
            icon={<Users className="h-5 w-5 text-muted-foreground" />}
            />
            <StatCard
            title="Total Investments Value (NGN)"
            value={<Currency value={stats.totalInvestments} />}
            icon={<Wallet className="h-5 w-5 text-muted-foreground" />}
            />
             <StatCard
            title="Total Withdrawals (Completed)"
            value={<Currency value={stats.totalWithdrawals} />}
            icon={<DollarSign className="h-5 w-5 text-muted-foreground" />}
            />
            <StatCard
            title="Pending Withdrawals"
            value={stats.pendingWithdrawalsCount.toLocaleString()}
            icon={<TrendingDown className="h-5 w-5 text-muted-foreground" />}
            />
             <StatCard
            title="Completed Withdrawals"
            value={stats.completedWithdrawalsCount.toLocaleString()}
            icon={<CheckCircle className="h-5 w-5 text-muted-foreground" />}
            />
        </div>

        <div className="space-y-6">
            <PerformanceChart />
            <Card>
                <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                    <CardDescription>A log of recent user actions and system events.</CardDescription>
                </CardHeader>
                <CardContent>
                    {recentActivities.length > 0 ? (
                        <div className="space-y-6">
                            {recentActivities.map((activity, index) => (
                                <div key={index} className="flex items-center gap-4">
                                    <Avatar className="h-10 w-10">
                                        <AvatarFallback><ActivityIcon type={activity.type} /></AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1">
                                        <p className="text-sm">
                                            <span className="font-semibold">{activity.user.fullName}</span> {activity.details}
                                        </p>
                                        <p className="text-xs text-muted-foreground">{timeAgo(activity.timestamp)}</p>
                                    </div>
                                    {activity.amount && (
                                        <Badge variant={activity.type === 'withdrawal' ? 'destructive' : 'secondary'}>
                                            <Currency value={activity.amount} />
                                        </Badge>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-muted-foreground">No recent activity to display.</p>
                    )}
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
