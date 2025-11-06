"use client";

import { useEffect, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { collection, query, Timestamp, onSnapshot, orderBy } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

import { WithdrawalForm } from "@/components/dashboard/withdrawal-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Currency } from "@/components/ui/currency";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Info } from "lucide-react";

interface Withdrawal {
  id: string;
  withdrawalId: string;
  amount: number;
  managementFee?: number;
  payoutAmount?: number;
  status: 'Pending' | 'Completed' | 'Rejected';
  createdAt: Timestamp;
}

export default function WithdrawalPage() {
  const [user] = useAuthState(auth);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);

  const today = new Date();
  
  // Special check for admin user
  const isAdminUser = user?.email === 'godisablegloballink@gmail.com';

  const isWithdrawalWindowOpen = today.getDate() === 1 || today.getDate() === 2 || isAdminUser;

  useEffect(() => {
    if (user) {
        setLoading(true);
        const q = query(collection(db, "users", user.uid, "withdrawals"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const withdrawalsData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Withdrawal));
            setWithdrawals(withdrawalsData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching withdrawal history:", error);
            setLoading(false);
        });

        // Cleanup the listener on component unmount
        return () => unsubscribe();
    } else if (user === null) {
        setLoading(false);
    }
  }, [user]);

  const formatDate = (timestamp: Timestamp | null) => {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate();
    return `${date.toLocaleDateString('en-GB')} ${date.toLocaleTimeString()}`;
  };

  const getStatusBadgeVariant = (status: Withdrawal['status']) => {
    switch (status) {
      case 'Completed':
        return 'default';
      case 'Pending':
        return 'secondary';
      case 'Rejected':
        return 'destructive';
      default:
        return 'outline';
    }
  };


  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
      <Card className="w-full max-w-2xl mx-auto">
          <CardHeader>
              <CardTitle className="font-headline text-2xl">Request a Withdrawal</CardTitle>
              <CardDescription>
                  Enter the amount you wish to withdraw (minimum of ₦2,000). Your available balance is based on your total investments. Withdrawals are processed within 1-5 business days.
              </CardDescription>
          </CardHeader>
          <CardContent>
              {!isWithdrawalWindowOpen && (
                  <Alert variant="destructive" className="mb-6">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Withdrawal Window Closed</AlertTitle>
                      <AlertDescription>
                          Withdrawals are only permitted on the 1st and 2nd of every month. Please check back on that day to submit a request.
                      </AlertDescription>
                  </Alert>
              )}
              <WithdrawalForm disabled={!isWithdrawalWindowOpen} />
          </CardContent>
      </Card>

      <Card className="w-full max-w-4xl mx-auto">
          <CardHeader>
              <CardTitle className="font-headline text-2xl">Withdrawal History</CardTitle>
              <CardDescription>
                  A record of all your past withdrawal requests.
              </CardDescription>
          </CardHeader>
          <CardContent>
              {loading ? (
                  <div className="space-y-2">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                  </div>
              ) : (
                  <Table>
                      <TableHeader>
                          <TableRow>
                              <TableHead>ID</TableHead>
                              <TableHead>Date & Time</TableHead>
                              <TableHead>Amount</TableHead>
                              <TableHead>Fee (2%)</TableHead>
                              <TableHead>Payout</TableHead>
                              <TableHead className="text-right">Status</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {withdrawals.length > 0 ? (
                              withdrawals.map((w) => (
                                  <TableRow key={w.id}>
                                      <TableCell className="font-mono text-xs">{w.withdrawalId}</TableCell>
                                      <TableCell>{formatDate(w.createdAt)}</TableCell>
                                      <TableCell className="font-mono">
                                          <Currency value={w.amount} />
                                      </TableCell>
                                      <TableCell className="font-mono text-destructive">
                                          <Currency value={w.managementFee ?? w.amount * 0.02} />
                                      </TableCell>
                                      <TableCell className="font-mono font-bold">
                                          <Currency value={w.payoutAmount ?? w.amount * 0.98} />
                                      </TableCell>
                                      <TableCell className="text-right">
                                          <Badge variant={getStatusBadgeVariant(w.status)}>{w.status}</Badge>
                                      </TableCell>
                                  </TableRow>
                              ))
                          ) : (
                              <TableRow>
                                  <TableCell colSpan={6} className="h-24 text-center">
                                      You have not made any withdrawals yet.
                                  </TableCell>
                              </TableRow>
                          )}
                      </TableBody>
                  </Table>
              )}
          </CardContent>
      </Card>
    </div>
  );
}
