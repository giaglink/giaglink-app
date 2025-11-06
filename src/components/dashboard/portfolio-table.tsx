"use client"

import { useMemo, useState, useEffect } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { collection, query, onSnapshot, orderBy } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Currency } from "../ui/currency";
import type { Investment } from "@/lib/types";
import { Skeleton } from "../ui/skeleton";


interface PortfolioTableProps {
    investments?: Investment[];
}

export function PortfolioTable({ investments = [] }: PortfolioTableProps) {
  const [liveInvestments, setLiveInvestments] = useState<Investment[]>(investments);
  const [loading, setLoading] = useState(!investments.length); // If no initial investments, we are loading
  const [user] = useAuthState(auth);
  
  useEffect(() => {
    if (user) {
        setLoading(true);
        const q = query(collection(db, "users", user.uid, "investments"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const investmentsData = querySnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    createdAt: data.createdAt.toDate().toISOString(),
                } as unknown as Investment;
            });
            setLiveInvestments(investmentsData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching portfolio:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    } else if (!user && !investments.length) {
        // Handle case where there's no user and no initial props
        setLoading(false);
    }
  }, [user, investments.length]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return `${date.toLocaleDateString('en-GB')} ${date.toLocaleTimeString()}`;
  }

  const getMonthlyPercentage = (investmentType: string): number => {
    const match = investmentType.match(/(\d+)%/);
    return match ? parseFloat(match[1]) : 0;
  };

  const calculateMonthlyPayout = (investment: Investment): number => {
    // Don't calculate payout for pending or rejected investments
    if (investment.status === 'Pending' || investment.status === 'Rejected') {
      return 0;
    }
    const monthlyRate = getMonthlyPercentage(investment.investmentType) / 100;
    return investment.amount * monthlyRate;
  }

  const getStatusBadgeVariant = (status?: Investment['status']) => {
    switch (status) {
      case 'Approved': return 'default';
      case 'Pending': return 'secondary';
      case 'Rejected': return 'destructive';
      default: return 'default'; // For old investments with no status
    }
  };
  
  const { totalValue, totalMonthlyPayout } = useMemo(() => {
    // Only calculate totals for approved investments
    const approvedInvestments = liveInvestments.filter(inv => inv.status === 'Approved' || !inv.status);
    
    const totalVal = approvedInvestments.reduce((acc, investment) => acc + investment.amount, 0);
    const totalPayout = approvedInvestments.reduce((acc, investment) => acc + calculateMonthlyPayout(investment), 0);

    return {
        totalValue: totalVal,
        totalMonthlyPayout: totalPayout,
    };
  }, [liveInvestments]);

  if (loading) {
      return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">Portfolio Summary</CardTitle>
                <CardDescription>
                A summary of your current investments.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
            </CardContent>
        </Card>
      )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Portfolio Summary</CardTitle>
        <CardDescription>
          A summary of your current investments.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Investment</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Value (NGN)</TableHead>
              <TableHead className="text-right">Monthly Payout</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {liveInvestments.length > 0 ? (
                liveInvestments.map((investment) => (
                <TableRow key={investment.id}>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <div className="font-medium">{investment.investmentType.split(' - ')[0]}</div>
                        <Badge variant="outline" className="w-fit bg-secondary text-secondary-foreground">{investment.investmentType}</Badge>
                        <Badge variant="outline" className="w-fit">12 Months Irrevocable Tenure</Badge>
                        <div className="text-sm text-muted-foreground">
                            {formatDate(investment.createdAt)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(investment.status)}>
                        {investment.status || 'Approved'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono"><Currency value={investment.amount} /></TableCell>
                    <TableCell className="text-right font-mono">
                        <Currency value={calculateMonthlyPayout(investment)} />
                    </TableCell>
                </TableRow>
                ))
            ) : (
                <TableRow>
                    <TableCell colSpan={4} className="text-center h-24">
                        You have no investments yet.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
          {liveInvestments.length > 0 && (
            <TableFooter>
                <TableRow>
                    <TableCell className="font-bold" colSpan={2}>Total (Approved)</TableCell>
                    <TableCell className="text-right font-mono font-bold">
                        <Currency value={totalValue} />
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold">
                        <Currency value={totalMonthlyPayout} />
                    </TableCell>
                </TableRow>
            </TableFooter>
          )}
        </Table>
      </CardContent>
    </Card>
  );
}
