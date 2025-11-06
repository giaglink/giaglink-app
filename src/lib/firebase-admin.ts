import { initializeApp, getApps, cert, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// This pattern ensures that the Firebase Admin SDK is initialized only once.
const createFirebaseAdminApp = () => {
    if (getApps().length > 0) {
        return getApp();
    }

    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountKey) {
        throw new Error(
            "FIREBASE_SERVICE_ACCOUNT_KEY is not set in your environment variables. " +
            "Please ensure it is available on the server."
        );
    }
    
    try {
        const serviceAccount = JSON.parse(serviceAccountKey);
        return initializeApp({
            credential: cert(serviceAccount),
        });
    } catch (error: any) {
        throw new Error(
            "Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY. " +
            "Ensure it is a valid JSON string. Error: " + error.message
        );
    }
};

const app = createFirebaseAdminApp();
const db = getFirestore(app);

export { app, db };
