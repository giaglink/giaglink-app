'use server';

import { db } from '@/lib/firebase-admin';
import { type Timestamp } from 'firebase-admin/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminWithdrawalsClient } from "@/components/admin/withdrawals-client";

interface Withdrawal {
  id: string; 
  userId: string;
  withdrawalId: string;
  amount: number;
  managementFee: number;
  payoutAmount: number;
  status: 'Pending' | 'Completed' | 'Rejected';
  createdAt: string; 
}

interface User {
  id: string;
  fullName: string;
  email: string;
  whatsappNumber: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
}

export interface WithdrawalWithUser extends Withdrawal {
  user: User | null;
  docPath: string; 
}

async function getWithdrawals(): Promise<WithdrawalWithUser[]> {
    try {
        const withdrawalsQuery = db.collectionGroup('withdrawals');
        const withdrawalsSnapshot = await withdrawalsQuery.get();

        if (withdrawalsSnapshot.empty) {
            return [];
        }

        const userIds = [...new Set(withdrawalsSnapshot.docs.map(doc => doc.ref.parent.parent!.id))];

        const usersSnapshot = await db.collection('users').where('__name__', 'in', userIds).get();
        const usersMap = new Map<string, User>();
        usersSnapshot.forEach(doc => {
            const data = doc.data();
            usersMap.set(doc.id, {
                id: doc.id,
                fullName: data.fullName,
                email: data.email,
                whatsappNumber: data.whatsappNumber,
                bankName: data.bankName,
                accountName: data.accountName,
                accountNumber: data.accountNumber,
            });
        });
        
        const withdrawalsData = withdrawalsSnapshot.docs.map(d => {
            const data = d.data() as Omit<Withdrawal, 'id' | 'createdAt' | 'userId'> & {createdAt: Timestamp};
            const userId = d.ref.parent.parent!.id;
            const user = usersMap.get(userId) || null;

            return { 
                ...data, 
                id: d.id, 
                userId: userId,
                user, 
                docPath: d.ref.path,
                createdAt: data.createdAt.toDate().toISOString(),
             } as WithdrawalWithUser;
        });

        withdrawalsData.sort((a, b) => {
            if (a.status === 'Pending' && b.status !== 'Pending') return -1;
            if (a.status !== 'Pending' && b.status === 'Pending') return 1;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        return withdrawalsData;
    } catch (error) {
        console.error("Error fetching withdrawals:", error);
        return [];
    }
}


export default async function AdminWithdrawalsPage() {
  const withdrawals = await getWithdrawals();

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <Card>
        <CardHeader>
          <CardTitle>Withdrawal Requests</CardTitle>
          <CardDescription>
            View, approve, or reject user withdrawal requests.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AdminWithdrawalsClient initialWithdrawals={withdrawals} />
        </CardContent>
      </Card>
    </div>
  );
}
