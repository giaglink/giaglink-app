import type { Timestamp } from "firebase/firestore";

// Shared types for the application

export interface Investment {
    id: string;
    investmentType: string;
    amount: number;
    createdAt: string; // Serialized as ISO string
    status?: 'Pending' | 'Approved' | 'Rejected';
}

export interface InvestmentFirestore {
    id: string;
    investmentType: string;
    amount: number;
    createdAt: Timestamp;
    status?: 'Pending' | 'Approved' | 'Rejected';
}


export interface Withdrawal {
    id: string;
    amount: number;
    payoutAmount?: number;
    status: 'Pending' | 'Completed' | 'Rejected';
    createdAt: string; // Serialized as ISO string
}

export interface UserData {
    fullName: string;
    email: string;
    whatsappNumber: string;
    bankName: string;
    accountName: string;
    accountNumber: string;
}

export interface ChartDataPoint {
    date: string;
    value: number;
}
