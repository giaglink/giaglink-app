'use server';

import { db } from '@/lib/firebase-admin';
import type { Timestamp } from 'firebase-admin/firestore';
import { sendInvestmentUpdateEmail, type UserDetailsForEmail, type InvestmentDetailsForEmail } from '@/services/email';

// Helper to get user data from Firestore using Admin SDK
async function getUserDetails(userId: string): Promise<UserDetailsForEmail | null> {
    const userRef = db.collection('users').doc(userId);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
        console.error(`User with ID ${userId} not found.`);
        return null;
    }
    const userData = userSnap.data();
    if (!userData) return null;
    
    // Ensure all fields for UserDetailsForEmail are present
    return { 
        id: userId, 
        fullName: userData.fullName || '',
        email: userData.email || '',
        whatsappNumber: userData.whatsappNumber || '',
        bankName: userData.bankName || '',
        accountName: userData.accountName || '',
        accountNumber: userData.accountNumber || '',
    };
}

// Helper to get investment data from Firestore using Admin SDK
async function getInvestmentDetails(userId: string, investmentId: string) {
    const investmentRef = db.collection('users').doc(userId).collection('investments').doc(investmentId);
    const investmentSnap = await investmentRef.get();
    if (!investmentSnap.exists) {
        console.error(`Investment with ID ${investmentId} for user ${userId} not found.`);
        return null;
    }
    const data = investmentSnap.data();
    if (!data) return null;

    return {
        id: investmentSnap.id,
        investmentId: data.investmentId,
        investmentType: data.investmentType,
        amount: data.amount,
        createdAt: data.createdAt as Timestamp,
    };
}

export async function updateInvestmentStatusAndNotify({
    userId,
    investmentId,
    newStatus,
}: {
    userId: string;
    investmentId: string;
    newStatus: 'Approved' | 'Rejected';
}) {
    'use server';

    try {
        const investmentRef = db.collection('users').doc(userId).collection('investments').doc(investmentId);
        
        // 1. Fetch all required data first
        const [user, investment] = await Promise.all([
            getUserDetails(userId),
            getInvestmentDetails(userId, investmentId)
        ]);

        if (!user || !investment) {
            throw new Error(`Could not retrieve user or investment details. User: ${userId}, Investment: ${investmentId}`);
        }

        // 2. Update the document status
        await investmentRef.update({ status: newStatus });
        
        // 3. Prepare payload for email
        const emailInvestmentPayload: InvestmentDetailsForEmail = {
            id: investment.investmentId, // Use the sequential ID for the email
            type: investment.investmentType,
            amount: investment.amount,
            date: investment.createdAt.toDate(), // Pass the Date object
        };
        
        // 4. Send the notification
        await sendInvestmentUpdateEmail({
            user,
            investment: emailInvestmentPayload,
            newStatus,
        });

        return { success: true, message: `Investment has been marked as ${newStatus} and user notified.` };
    } catch (error) {
        console.error("Error updating status and sending notification:", error);
        return { success: false, message: 'An error occurred during the update process. Please check server logs.' };
    }
}
