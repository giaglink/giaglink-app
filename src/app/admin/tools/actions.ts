'use server';

import { db } from '@/lib/firebase-admin';
import type { Timestamp } from 'firebase-admin/firestore';
import { sendFullPortfolioReportEmail, type InvestmentForEmail, type WithdrawalForEmail, type UserDetailsForEmail } from '@/services/email';
import * as XLSX from 'xlsx';

// --- Interfaces ---
interface InvestmentDoc {
    investmentId?: string;
    investmentType: string;
    amount: number;
    status: 'Pending' | 'Approved' | 'Rejected';
    createdAt: Timestamp;
}

interface WithdrawalDoc {
    withdrawalId?: string;
    amount: number;
    status: string;
    managementFee?: number;
    payoutAmount: number;
    createdAt: Timestamp;
}

interface UserDoc {
    fullName: string;
    email: string;
    whatsappNumber: string;
    bankName: string;
    accountName: string;
    accountNumber: string;
}

const getMonthlyPercentage = (investmentType: string): number => {
    const match = investmentType.match(/(\d+)%/);
    return match ? parseFloat(match[1]) : 0;
};

const calculateMonthlyPayout = (amount: number, investmentType: string): number => {
    const monthlyRate = getMonthlyPercentage(investmentType) / 100;
    return amount * monthlyRate;
}

const createFullReportExcel = (user: UserDetailsForEmail, investments: InvestmentForEmail[], withdrawals: WithdrawalForEmail[], startDate?: string, endDate?: string): Buffer => {
    const wb = XLSX.utils.book_new();

    const dateRangeText = startDate && endDate
        ? `${startDate} to ${endDate}`
        : 'All Time';

    // User Details Sheet
    const userDetailsData = [
        ["User Details"],
        ["Full Name", user.fullName],
        ["Email Address", user.email],
        ["WhatsApp Number", user.whatsappNumber],
        [],
        ["User Bank Details"],
        ["Bank Name", user.bankName],
        ["Account Name", user.accountName],
        ["Account Number", user.accountNumber],
        [],
        ["Report Details"],
        ["Date Range", dateRangeText],
    ];
    const wsUserDetails = XLSX.utils.aoa_to_sheet(userDetailsData);
    wsUserDetails['!cols'] = [{ wch: 20 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, wsUserDetails, "User Details");

    // Portfolio Summary Sheet
    const investmentHeaders = ["Inv. ID", "Type", "Plan Details", "Date", "Status", "Amount", "Monthly Payout"];
    const investmentData = investments.map(item => [
        item.investmentId,
        item.investmentType.split(' - ')[0],
        item.investmentType,
        item.createdAt.toLocaleDateString('en-GB'),
        item.status,
        item.amount,
        calculateMonthlyPayout(item.amount, item.investmentType)
    ]);
    const totalValue = investments.reduce((acc, item) => acc + item.amount, 0);
    const totalMonthlyPayout = investments.reduce((acc, item) => acc + calculateMonthlyPayout(item.amount, item.investmentType), 0);
    const investmentFooter = ["TOTAL", "", "", "", "", totalValue, totalMonthlyPayout];
    const wsInvestmentData = [investmentHeaders, ...investmentData, [], investmentFooter];
    const wsInvestments = XLSX.utils.aoa_to_sheet(wsInvestmentData);
    wsInvestments['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 30 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, wsInvestments, "Investments");

    // Withdrawals Sheet
    const withdrawalHeaders = ["Date", "ID", "Amount", "Fee", "Payout", "Status"];
    const withdrawalData = withdrawals.map(item => [
        item.createdAt.toLocaleDateString('en-GB'),
        item.withdrawalId,
        item.amount,
        item.fee,
        item.payoutAmount,
        item.status
    ]);
    const wsWithdrawalData = [withdrawalHeaders, ...withdrawalData];
    const wsWithdrawals = XLSX.utils.aoa_to_sheet(wsWithdrawalData);
    wsWithdrawals['!cols'] = [{ wch: 12 }, { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, wsWithdrawals, "Withdrawals");

    return XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
}


// --- Main Server Actions ---
export async function resendUserNotification({ email }: { email: string; }): Promise<{ success: boolean; message?: string; }> {
    if (!email) {
        return { success: false, message: 'Email address is required.' };
    }
    console.log(`Starting report generation for email: ${email}`);

    try {
        const usersQuery = db.collection('users').where('email', '==', email).limit(1);
        const usersSnapshot = await usersQuery.get();

        if (usersSnapshot.empty) {
            console.log(`No user found with email: ${email}`);
            return { success: false, message: `No user found with the email: ${email}` };
        }
        
        const userDoc = usersSnapshot.docs[0];
        const userData = userDoc.data() as UserDoc;
        const user: UserDetailsForEmail = {
            id: userDoc.id,
            fullName: userData.fullName || 'N/A',
            email: userData.email || 'N/A',
            whatsappNumber: userData.whatsappNumber || 'N/A',
            bankName: userData.bankName || 'N/A',
            accountName: userData.accountName || 'N.A',
            accountNumber: userData.accountNumber || 'N/A'
        };

        // --- Fetch All Investments ---
        const investmentsSnapshot = await userDoc.ref.collection('investments').orderBy('createdAt', 'desc').get();
        const allInvestments: InvestmentForEmail[] = investmentsSnapshot.docs.map(doc => {
            const data = doc.data() as InvestmentDoc;
            return {
                investmentId: data.investmentId ?? doc.id,
                investmentType: data.investmentType,
                amount: data.amount,
                status: data.status,
                createdAt: data.createdAt.toDate(),
            };
        });

        // --- Fetch All Withdrawals ---
        const withdrawalsSnapshot = await userDoc.ref.collection('withdrawals').orderBy('createdAt', 'desc').get();
        const allWithdrawals: WithdrawalForEmail[] = withdrawalsSnapshot.docs.map(doc => {
            const data = doc.data() as WithdrawalDoc;
            return {
                withdrawalId: data.withdrawalId ?? doc.id,
                amount: data.amount,
                fee: data.managementFee ?? 0,
                payoutAmount: data.payoutAmount,
                status: data.status,
                createdAt: data.createdAt.toDate(),
            };
        });
        
        await sendFullPortfolioReportEmail({
            user,
            investments: allInvestments,
            withdrawals: allWithdrawals,
        });
        
        console.log(`Report sent for user: ${user.fullName}`);
        return {
            success: true,
            message: `Successfully sent full portfolio report for ${user.fullName}.`
        };

    } catch (error) {
        console.error(`Critical error in resendUserNotification action for ${email}:`, error);
        return { success: false, message: 'An error occurred during the process. Check server logs.' };
    }
}


export async function exportUserDataAsExcel({ email, startDate, endDate }: { email: string; startDate?: string; endDate?: string; }): Promise<{ success: boolean; message?: string; data?: string; fileName?: string; }> {
    if (!email) {
        return { success: false, message: 'Email address is required.' };
    }
    console.log(`Starting export process for email: ${email}`);

    try {
        const usersQuery = db.collection('users').where('email', '==', email).limit(1);
        const usersSnapshot = await usersQuery.get();

        if (usersSnapshot.empty) {
            console.log(`No user found with email: ${email}`);
            return { success: false, message: `No user found with the email: ${email}` };
        }

        const userDoc = usersSnapshot.docs[0];
        const userData = userDoc.data() as UserDoc;
        const user: UserDetailsForEmail = {
            id: userDoc.id,
            fullName: userData.fullName || 'N/A',
            email: userData.email || 'N/A',
            whatsappNumber: userData.whatsappNumber || 'N/A',
            bankName: userData.bankName || 'NA',
            accountName: userData.accountName || 'N/A',
            accountNumber: userData.accountNumber || 'N/A'
        };
        console.log(`Found user: ${user.fullName}`);
        
        // --- Date handling for Firestore queries ---
        let investmentsQuery = userDoc.ref.collection('investments').orderBy('createdAt', 'desc');
        let withdrawalsQuery = userDoc.ref.collection('withdrawals').orderBy('createdAt', 'desc');

        if (startDate) {
            // startDate is 'YYYY-MM-DD', create UTC date
            const startOfDay = new Date(`${startDate}T00:00:00.000Z`);
            investmentsQuery = investmentsQuery.where('createdAt', '>=', startOfDay);
            withdrawalsQuery = withdrawalsQuery.where('createdAt', '>=', startOfDay);
        }
        if (endDate) {
            // endDate is 'YYYY-MM-DD', create UTC date for end of day
            const endOfDay = new Date(`${endDate}T23:59:59.999Z`);
            investmentsQuery = investmentsQuery.where('createdAt', '<=', endOfDay);
            withdrawalsQuery = withdrawalsQuery.where('createdAt', '<=', endOfDay);
        }
        // --- End of date handling ---

        const [investmentsSnapshot, withdrawalsSnapshot] = await Promise.all([
            investmentsQuery.get(),
            withdrawalsQuery.get()
        ]);

        const allInvestments: InvestmentForEmail[] = investmentsSnapshot.docs.map(doc => {
            const data = doc.data() as InvestmentDoc;
            return {
                investmentId: data.investmentId ?? doc.id,
                investmentType: data.investmentType,
                amount: data.amount,
                status: data.status,
                createdAt: data.createdAt.toDate(),
            };
        });

        const allWithdrawals: WithdrawalForEmail[] = withdrawalsSnapshot.docs.map(doc => {
            const data = doc.data() as WithdrawalDoc;
            return {
                withdrawalId: data.withdrawalId ?? doc.id,
                amount: data.amount,
                fee: data.managementFee ?? 0,
                payoutAmount: data.payoutAmount,
                status: data.status,
                createdAt: data.createdAt.toDate(),
            };
        });

        console.log(`Found ${allInvestments.length} investments and ${allWithdrawals.length} withdrawals for ${user.fullName}.`);

        const excelBuffer = createFullReportExcel(user, allInvestments, allWithdrawals, startDate, endDate);
        const base64Data = excelBuffer.toString('base64');
        
        const datePart = startDate && endDate
          ? `${startDate}_to_${endDate}`
          : new Date().toISOString().split('T')[0];
        
        const fileName = `GOD_IS_ABLE_GLOBAL_LINK_Full_Report_${user.fullName.replace(/\s/g, '_')}_${datePart}.xlsx`;

        return {
            success: true,
            data: base64Data,
            fileName: fileName,
        };

    } catch (error) {
        console.error(`Critical error in exportUserDataAsExcel action for ${email}:`, error);
        return { success: false, message: 'An unexpected server error occurred during the export. Check server logs.' };
    }
}
