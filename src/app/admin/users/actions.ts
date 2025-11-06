'use server';

import { db } from '@/lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import type { UserDetailsForEmail } from '@/services/email';
import { sendUserStatusUpdateEmail } from '@/services/email';


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


export async function toggleUserStatus(userId: string, newStatus: boolean) {
  try {
    const auth = getAuth();
    const userRef = db.collection('users').doc(userId);

    // Fetch user details before making changes
    const user = await getUserDetails(userId);
    if (!user) {
        throw new Error(`Could not retrieve details for user ${userId}.`);
    }

    // Update Firebase Authentication state
    // `disabled: true` means the user is inactive/deactivated.
    await auth.updateUser(userId, { disabled: !newStatus });

    // Update Firestore document using the admin SDK's update method
    await userRef.update({ isActive: newStatus });
    
    // Send notification email
    await sendUserStatusUpdateEmail({ user, newStatus });

    return { 
      success: true, 
      message: `User has been successfully ${newStatus ? 'activated' : 'deactivated'} and notified.` 
    };

  } catch (error) {
    console.error(`Error toggling user status for ${userId}:`, error);
    return { 
      success: false, 
      message: 'Failed to update user status. Please check server logs.' 
    };
  }
}
