'use server';

import { db } from '@/lib/firebase-admin';
import type { Timestamp } from 'firebase-admin/firestore';
import { sendWithdrawalUpdateEmail, type UserDetailsForEmail, type WithdrawalDetailsForEmail } from '@/services/email';

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

// Helper to get withdrawal data from Firestore using Admin SDK
async function getWithdrawalDetails(userId: string, withdrawalId: string) {
    const withdrawalRef = db.collection('users').doc(userId).collection('withdrawals').doc(withdrawalId);
    const withdrawalSnap = await withdrawalRef.get();
    if (!withdrawalSnap.exists) {
        console.error(`Withdrawal with ID ${withdrawalId} for user ${userId} not found.`);
        return null;
    }
    const data = withdrawalSnap.data();
    if (!data) return null;

    return {
        id: withdrawalSnap.id,
        withdrawalId: data.withdrawalId,
        amount: data.amount,
        managementFee: data.managementFee,
        payoutAmount: data.payoutAmount,
        createdAt: data.createdAt as Timestamp,
    };
}


export async function updateWithdrawalStatusAndNotify({
    userId,
    withdrawalId,
    newStatus,
}: {
    userId: string;
    withdrawalId: string;
    newStatus: 'Completed' | 'Rejected';
}) {
    'use server';

    try {
        const withdrawalRef = db.collection('users').doc(userId).collection('withdrawals').doc(withdrawalId);
        
        // 1. Fetch all required data first to ensure everything exists before we make changes.
        const [user, withdrawal] = await Promise.all([
            getUserDetails(userId),
            getWithdrawalDetails(userId, withdrawalId)
        ]);

        if (!user || !withdrawal) {
            throw new Error(`Could not retrieve user or withdrawal details. User: ${userId}, Withdrawal: ${withdrawalId}`);
        }

        // 2. Now that we have the data, update the document status using the Admin SDK's update method
        await withdrawalRef.update({ status: newStatus });
        
        // 3. Prepare payload for email with the data we already fetched
        const emailWithdrawalPayload: WithdrawalDetailsForEmail = {
            id: withdrawal.withdrawalId, // Use the sequential ID for the email
            amount: withdrawal.amount,
            fee: withdrawal.managementFee ?? 0, // Ensure fee is not undefined
            payoutAmount: withdrawal.payoutAmount,
            date: withdrawal.createdAt.toDate(), // Pass the Date object
        };
        
        // 4. Send the notification
        await sendWithdrawalUpdateEmail({
            user,
            withdrawal: emailWithdrawalPayload,
            newStatus,
        });

        return { success: true, message: `Withdrawal has been marked as ${newStatus} and user notified.` };
    } catch (error) {
        console.error("Error updating status and sending notification:", error);
        return { success: false, message: 'An error occurred during the update process. Please check server logs.' };
    }
}
