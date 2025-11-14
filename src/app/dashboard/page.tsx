"use client";

import { useEffect, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { useRouter } from "next/navigation";
import { collection, query, getDocs, doc, getDoc, orderBy } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import Link from "next/link";
import { calculateProfitForInvestment } from "@/lib/investment-utils";
import type { Investment, Withdrawal, UserData } from "@/lib/types";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { StatCard } from "../../components/dashboard/stat-card";
import { Currency } from "../../components/ui/currency";
import { DollarSign, Percent, TrendingDown } from "lucide-react";
import { Button } from "../../components/ui/button";
import { PerformanceChart } from "../../components/dashboard/performance-chart";
import { PortfolioTable } from "../../components/dashboard/portfolio-table";
import { AddInvestmentButton } from "../../components/dashboard/add-investment-button";
import { Skeleton } from "../../components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useLoading } from "@/contexts/loading-context";


async function getDashboardData(userId: string) {
    try {
        const userDocRef = doc(db, "users", userId);
        
        const investmentsQuery = query(collection(db, "users", userId, "investments"), orderBy("createdAt", "desc"));
        const withdrawalsQuery = query(collection(db, "users", userId, "withdrawals"));

        const [userDocSnap, investmentsSnapshot, withdrawalsSnapshot] = await Promise.all([
            getDoc(userDocRef),
            getDocs(investmentsQuery),
            getDocs(withdrawalsQuery)
        ]);

        const userData = userDocSnap.exists() ? userDocSnap.data() as UserData : null;

        const investmentsData = investmentsSnapshot.docs.map(d => {
            const data = d.data();
            return {
                id: d.id,
                ...data,
                createdAt: data.createdAt.toDate().toISOString(), // Serialize date
            } as unknown as Investment;
        });
        
        const withdrawalsData = withdrawalsSnapshot.docs.map(d => {
            const data = d.data();
            return {
                id: d.id,
                ...data,
                createdAt: data.createdAt.toDate().toISOString(), // Serialize date
            } as unknown as Withdrawal;
        });

        return { userData, investments: investmentsData, withdrawals: withdrawalsData };

    } catch (error) {
        console.error("Firebase data fetching error:", error);
        return { userData: null, investments: [], withdrawals: [] };
    }
}


export default function DashboardPage() {
    const router = useRouter();
    const [user, authLoading] = useAuthState(auth);
    const [dashboardData, setDashboardData] = useState<{ userData: UserData | null; investments: Investment[]; withdrawals: Withdrawal[] } | null>(null);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();
    const [recalculatedProfit, setRecalculatedProfit] = useState<number | null>(null);
    const { setIsLoading: setIsAppLoading } = useLoading();

    useEffect(() => {
        if (authLoading) {
            setIsAppLoading(true);
            return;
        };

        if (!user) {
            setIsAppLoading(false);
            router.replace('/');
            return;
        }

        const fetchData = async () => {
            setIsAppLoading(true);
            setLoading(true);

            const data = await getDashboardData(user.uid);

            if (!data.userData) {
                console.error(`No Firestore document found for user UID: ${user.uid}`);
                toast({
                    title: "User Profile Not Found",
                    description: "Your user data could not be found. Please contact support. Signing you out.",
                    variant: "destructive"
                });
                await signOut(auth);
                setIsAppLoading(false);
                router.replace('/');
                return;
            }
            
            setDashboardData(data);
            setLoading(false);
            setIsAppLoading(false);
        };

        fetchData();
    }, [user, authLoading, router, toast, setIsAppLoading]);


    useEffect(() => {
        if (!dashboardData) return;
        
        const approvedInvestments = dashboardData.investments.filter(inv => inv.status === 'Approved' || !inv.status);

        const intervalId = setInterval(() => {
            const currentProfit = approvedInvestments.reduce((acc, investment) => {
                const profit = calculateProfitForInvestment(investment);
                return acc + profit;
            }, 0);
            setRecalculatedProfit(currentProfit);
        }, 3600000); // 1 hour

        return () => clearInterval(intervalId);
    }, [dashboardData]);
    
    if (loading || authLoading || !dashboardData) {
        return (
            <div className="p-8 space-y-8">
                <Skeleton className="h-24 w-full" />
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    <Skeleton className="h-40 w-full" />
                    <Skeleton className="h-40 w-full" />
                    <Skeleton className="h-40 w-full" />
                </div>
                <Skeleton className="h-80 w-full" />
                <Skeleton className="h-60 w-full" />
            </div>
        )
    }
    
    const { userData, investments, withdrawals } = dashboardData;
    const firstName = userData?.fullName.split(' ')[0];
    const approvedInvestments = investments.filter(inv => inv.status === 'Approved' || !inv.status);
    const totalInvestment = approvedInvestments.reduce((acc, investment) => acc + investment.amount, 0);
    const totalCalculatedProfit = recalculatedProfit ?? approvedInvestments.reduce((acc, investment) => acc + calculateProfitForInvestment(investment), 0);
    const totalWithdrawals = withdrawals.filter(w => w.status === 'Completed').reduce((acc, withdrawal) => acc + (withdrawal.payoutAmount || 0), 0);
    const totalProfitPercentage = totalInvestment > 0 ? (totalCalculatedProfit / totalInvestment) * 100 : 0;

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-8">
            <Card>
                <CardHeader>
                    <div>
                        <CardTitle className="font-headline text-2xl">
                        {firstName ? `Welcome back, ${firstName}!` : "Welcome Back!"}
                        </CardTitle>
                        <CardDescription>
                        Here's a quick overview of your investment portfolio.
                        </CardDescription>
                    </div>
                </CardHeader>
            </Card>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <StatCard
                title="Total Investments"
                value={<Currency value={totalInvestment} />}
                icon={<DollarSign className="h-5 w-5 text-primary" />}
                footer={<AddInvestmentButton buttonText="Add New Investment" buttonClassName="animate-pulse-glow" />}
              />
              <StatCard
                title="Total Profit / Gain"
                value={<Currency value={totalCalculatedProfit} />}
                icon={<Percent className="h-5 w-5 text-primary" />}
                change={`${totalProfitPercentage >= 0 ? '+' : ''}${totalProfitPercentage.toFixed(1)}%`}
                changeColor={totalProfitPercentage >= 0 ? "text-green-500" : "text-red-500"}
                footer={
                    <Button asChild size="sm" className="w-full bg-primary-light text-primary-light-foreground hover:bg-primary-light/90 animate-pulse-glow">
                        <Link href="/dashboard/withdrawal">Initiate Withdrawal</Link>
                    </Button>
                }
              />
               <StatCard
                title="Total Withdrawals"
                value={<Currency value={totalWithdrawals} />}
                icon={<TrendingDown className="h-5 w-5 text-primary" />}
              />
            </div>

            <div className="grid grid-cols-1 gap-6">
              <PerformanceChart />
              <PortfolioTable investments={investments} />
            </div>
      </div>
    );
}
