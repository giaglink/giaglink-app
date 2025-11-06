'use server';

import { db } from '@/lib/firebase-admin';
import type { Timestamp } from 'firebase-admin/firestore';
import Link from 'next/link';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { UserStatusToggle } from '@/components/admin/user-status-toggle';
import { getAuth } from 'firebase-admin/auth';
import { Currency } from '@/components/ui/currency';

interface Investment {
    id: string;
    investmentType: string;
    amount: number;
    createdAt: Timestamp;
}

interface Withdrawal {
    id: string;
    amount: number;
    createdAt: Timestamp;
}

interface User {
  id: string;
  fullName: string;
  email: string;
  whatsappNumber: string;
  createdAt: string; 
  isAdmin: boolean;
  isActive: boolean;
  withdrawableBalance: number;
}

const getMonthlyPercentage = (investmentType: string): number => {
    const match = investmentType.match(/(\d+)%/);
    return match ? parseFloat(match[1]) : 0;
};

const calculateMonthlyPayout = (investment: Investment): number => {
    const monthlyRate = getMonthlyPercentage(investment.investmentType) / 100;
    return investment.amount * monthlyRate;
};

async function getUsers(): Promise<User[]> {
    try {
        const usersQuery = db.collection("users").orderBy("createdAt", "desc");
        const usersSnapshot = await usersQuery.get();
        const auth = getAuth();

        const usersData = await Promise.all(usersSnapshot.docs.map(async (doc) => {
            const data = doc.data();
            let isActive = true;
            try {
                const userRecord = await auth.getUser(doc.id);
                isActive = !userRecord.disabled;
            } catch (error) {
                console.warn(`Could not fetch auth record for user ${doc.id}, assuming active.`, error);
            }

            // --- Calculate Withdrawable Balance ---
            let withdrawableBalance = 0;
            try {
                const today = new Date();
                const currentMonth = today.getMonth();
                const currentYear = today.getFullYear();

                const investmentsSnapshot = await doc.ref.collection('investments').get();
                const investmentsData = investmentsSnapshot.docs.map(d => ({ ...d.data(), id: d.id } as Investment));

                const eligibleInvestments = investmentsData.filter(inv => {
                    const investmentDate = inv.createdAt.toDate();
                    const investmentMonth = investmentDate.getMonth();
                    const investmentYear = investmentDate.getFullYear();
                    return investmentYear < currentYear || (investmentYear === currentYear && investmentMonth < currentMonth);
                });
                
                const totalMonthlyPayout = eligibleInvestments.reduce((sum, inv) => sum + calculateMonthlyPayout(inv), 0);

                const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

                const withdrawalsSnapshot = await doc.ref.collection('withdrawals')
                    .where("createdAt", ">=", startOfMonth)
                    .where("createdAt", "<=", endOfMonth)
                    .get();

                const withdrawalsData = withdrawalsSnapshot.docs.map(d => d.data() as Withdrawal);
                const totalWithdrawnThisMonth = withdrawalsData.reduce((sum, w) => sum + w.amount, 0);

                withdrawableBalance = totalMonthlyPayout - totalWithdrawnThisMonth;

            } catch(e) {
                console.error(`Failed to calculate balance for user ${doc.id}`, e);
            }
            // --- End Calculation ---

            return {
              id: doc.id,
              ...data,
              createdAt: (data.createdAt as Timestamp)?.toDate().toISOString() || new Date().toISOString(),
              isActive,
              withdrawableBalance: withdrawableBalance > 0 ? withdrawableBalance : 0,
            } as User;
        }));
        return usersData;
    } catch (error) {
        console.error("Error fetching users:", error);
        return [];
    }
}

const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString('en-GB');
};

const formatWhatsappNumber = (number: string) => {
    if (!number) return '';
    // Remove any non-digit characters and leading +
    let cleaned = number.replace(/\D/g, '');
    // Assuming Nigerian numbers, check if it starts with 234 already
    if (!cleaned.startsWith('234')) {
        // If it starts with 0, remove it and add 234
        if (cleaned.startsWith('0')) {
            cleaned = '234' + cleaned.substring(1);
        } else {
            // Otherwise, just prepend 234 (might not be correct for international)
            cleaned = '234' + cleaned;
        }
    }
    return cleaned;
}

export default async function AdminUsersPage() {
  const users = await getUsers();

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>
            View, search, and manage all registered users.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Full Name</TableHead>
                <TableHead>Contact & Balance</TableHead>
                <TableHead>WhatsApp Number</TableHead>
                <TableHead>Joined On</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length > 0 ? (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.fullName || 'N/A'}</TableCell>
                    <TableCell>
                      {user.email ? (
                        <a href={`mailto:${user.email}`} className="text-primary hover:underline">
                          {user.email}
                        </a>
                      ) : 'N/A'}
                       <div className="text-xs text-muted-foreground mt-1">
                          Withdrawable: <span className="font-mono text-primary"><Currency value={user.withdrawableBalance} /></span>
                        </div>
                    </TableCell>
                    <TableCell>
                      {user.whatsappNumber ? (
                        <a 
                          href={`https://wa.me/${formatWhatsappNumber(user.whatsappNumber)}`} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-primary hover:underline"
                        >
                          {user.whatsappNumber}
                        </a>
                      ) : 'N/A'}
                    </TableCell>
                    <TableCell>{formatDate(user.createdAt)}</TableCell>
                    <TableCell>
                      {user.isAdmin ? (
                        <Badge variant="destructive">Admin</Badge>
                      ) : (
                        <Badge variant="secondary">User</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                        <UserStatusToggle userId={user.id} initialIsActive={user.isActive} />
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No users found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
