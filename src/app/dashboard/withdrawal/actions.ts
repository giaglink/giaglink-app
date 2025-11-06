'use server';

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db as adminDb } from '@/lib/firebase-admin';
import * as bcrypt from 'bcryptjs';

/**
 * Securely hashes a PIN and saves it to the user's document in Firestore.
 * This is a single server action to ensure atomicity.
 * @param userId The ID of the user.
 * @param pin The new PIN to hash and save.
 * @returns A promise that resolves to an object indicating success or failure.
 */
export async function setWithdrawalPin(userId: string, pin: string): Promise<{ success: boolean; message?: string; }> {
    if (!userId || !pin) {
        return { success: false, message: 'User ID and PIN are required.' };
    }
    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPin = await bcrypt.hash(pin, salt);
        
        const userDocRef = adminDb.collection('users').doc(userId);
        await userDocRef.set({
            withdrawalPin: hashedPin,
        }, { merge: true });

        return { success: true };
    } catch (error) {
        console.error("Error hashing and setting PIN:", error);
        return { success: false, message: 'Failed to set PIN securely. Please try again.' };
    }
}


/**
 * Verifies a user's withdrawal PIN.
 * @param userId The ID of the user.
 * @param pin The PIN to verify.
 * @returns A promise that resolves to true if the PIN is correct, false otherwise.
 */
export async function verifyWithdrawalPin(userId: string, pin: string): Promise<boolean> {
    try {
        // Use adminDb to bypass any potential client-side Firestore security rules
        const userDocRef = adminDb.collection('users').doc(userId);
        const userDoc = await userDocRef.get();

        if (!userDoc.exists) {
            console.warn(`Verification failed: User document not found for ID ${userId}`);
            return false;
        }

        const hashedPin = userDoc.data()?.withdrawalPin;
        if (!hashedPin) {
             console.warn(`Verification failed: No PIN set for user ID ${userId}`);
            return false;
        }

        return await bcrypt.compare(pin, hashedPin);
    } catch (error) {
        console.error("Error verifying PIN:", error);
        return false;
    }
}
