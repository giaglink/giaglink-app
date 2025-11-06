'use server';

import { db } from '@/lib/firebase-admin';
import type { Timestamp } from 'firebase-admin/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminInvestmentsClient } from '@/components/admin/investments-client';

export interface Investment {
  id: string; // The document ID
  userId: string;
  investmentId: string; // The ID stored within the document
  investmentType: string;
  amount: number;
  status: 'Pending' | 'Approved' | 'Rejected';
  createdAt: string;
}

interface User {
  fullName: string;
}

export interface InvestmentWithUser extends Investment {
  user: User | null;
}

async function getInvestments(): Promise<InvestmentWithUser[]> {
    try {
        // Use a collection group query to fetch all investments at once.
        const investmentsSnapshot = await db.collectionGroup('investments').get();

        if (investmentsSnapshot.empty) {
            return [];
        }

        // Get unique user IDs from the investments
        const userIds = [...new Set(investmentsSnapshot.docs.map(doc => doc.ref.parent.parent!.id))];

        // Fetch all necessary user documents in a single query
        const usersSnapshot = await db.collection('users').where('__name__', 'in', userIds).get();
        const usersMap = new Map<string, User>();
        usersSnapshot.forEach(doc => {
            const data = doc.data();
            usersMap.set(doc.id, {
                fullName: data.fullName,
            });
        });

        // Map investments to include user data
        const allInvestments: InvestmentWithUser[] = investmentsSnapshot.docs.map(invDoc => {
            const invData = invDoc.data();
            const userId = invDoc.ref.parent.parent!.id;
            const user = usersMap.get(userId) || null;
            const createdAtDate = (invData.createdAt as Timestamp).toDate();

            // If a status exists on the document, use it.
            // If it does not exist, it's an old investment, so default to 'Approved'.
            const status: 'Pending' | 'Approved' | 'Rejected' = invData.status || 'Approved';

            return {
                id: invDoc.id,
                userId: userId,
                investmentId: invData.investmentId || invDoc.id,
                investmentType: invData.investmentType,
                amount: invData.amount,
                status: status,
                user,
                createdAt: createdAtDate.toISOString(),
            };
        });
        
        allInvestments.sort((a, b) => {
            // Prioritize 'Pending' status, then sort by date
            if (a.status === 'Pending' && b.status !== 'Pending') return -1;
            if (a.status !== 'Pending' && b.status === 'Pending') return 1;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        return allInvestments;
    } catch (error) {
        console.error("Error fetching investments with collectionGroup:", error);
        return [];
    }
}


export default async function AdminInvestmentsPage() {
  const investments = await getInvestments();

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <Card>
        <CardHeader>
          <CardTitle>All Investments</CardTitle>
          <CardDescription>
            View, approve, or reject user investments.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AdminInvestmentsClient initialInvestments={investments} />
        </CardContent>
      </Card>
    </div>
  );
}
