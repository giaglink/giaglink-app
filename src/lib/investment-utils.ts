import type { Timestamp } from "firebase/firestore";

// This type is used on the client, which receives a serialized string
export interface Investment {
    id: string;
    investmentType: string;
    amount: number;
    createdAt: string; // Changed from Timestamp to string for serialization
    status?: 'Pending' | 'Approved' | 'Rejected';
}

// This type is used when interacting directly with Firestore
export interface InvestmentFirestore {
    id:string;
    investmentType: string;
    amount: number;
    createdAt: Timestamp;
    status?: 'Pending' | 'Approved' | 'Rejected';
}

export const getMonthlyPercentage = (investmentType: string): number => {
    const match = investmentType.match(/(\d+)%/);
    return match ? parseFloat(match[1]) : 0;
};

// The function now accepts a shape that matches what comes from the server component (and Firestore hook)
export const calculateProfitForInvestment = (investment: { amount: number, investmentType: string, createdAt: string, status?: 'Pending' | 'Approved' | 'Rejected' }): number => {
    // Only calculate profit for approved or legacy (no status) investments
    if (investment.status === 'Pending' || investment.status === 'Rejected') {
        return 0;
    }

    const monthlyRate = getMonthlyPercentage(investment.investmentType) / 100;
    if (monthlyRate === 0) return 0;

    const startDate = new Date(investment.createdAt);
    const today = new Date();

    // If start date is in the future, no profit yet.
    if (startDate > today) return 0;

    // Calculate the exact time difference in milliseconds
    const timeDifference = today.getTime() - startDate.getTime();

    // Convert milliseconds to days (including fractional days for continuous increment)
    const daysPassed = timeDifference / (1000 * 3600 * 24);

    if (daysPassed <= 0) return 0;

    // Pro-rata daily rate based on a 30-day month average
    const dailyRate = monthlyRate / 30; 
    const totalProfit = investment.amount * dailyRate * daysPassed;

    return totalProfit;
};
