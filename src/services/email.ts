// IMPORTANT: This file should be imported with the `.ts` extension.
'use server';

import { Resend } from 'resend';
import * as XLSX from 'xlsx';

if (!process.env.RESEND_API_KEY) {
  throw new Error('RESEND_API_KEY is not set. Please add it to your .env.local file.');
}

const resend = new Resend(process.env.RESEND_API_KEY);
const ADMIN_EMAIL = 'godisablegloballink@gmail.com'; // Centralized admin email
const FROM_EMAIL = 'onboarding@resend.dev'; // Use Resend's required dev address
const FROM_NAME_EMAIL = `GOD IS ABLE GLOBAL LINK <${FROM_EMAIL}>`;

export interface UserDetailsForEmail {
  id?: string; // Make id optional as it's not always used
  fullName: string;
  email: string;
  whatsappNumber: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
}

interface NewInvestmentDetails {
  id: string;
  type: string;
  amount: number;
  date: string;
}

export interface InvestmentDetailsForEmail {
  id: string;
  type: string;
  amount: number;
  date: Date;
}

export interface WithdrawalDetailsForEmail {
    id: string;
    amount: number;
    fee: number;
    payoutAmount: number;
    date: Date;
}

export interface InvestmentForEmail {
  investmentId: string;
  investmentType: string;
  amount: number;
  createdAt: Date;
  status: 'Pending' | 'Approved' | 'Rejected';
}

export interface WithdrawalForEmail {
  withdrawalId: string;
  amount: number;
  fee: number;
  payoutAmount: number;
  status: string;
  createdAt: Date;
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
}

const getMonthlyPercentage = (investmentType: string): number => {
    const match = investmentType.match(/(\d+)%/);
    return match ? parseFloat(match[1]) : 0;
};

const calculateMonthlyPayout = (amount: number, investmentType: string): number => {
    const monthlyRate = getMonthlyPercentage(investmentType) / 100;
    return amount * monthlyRate;
}

const generatePortfolioHtml = (portfolio: InvestmentForEmail[]): string => {
    if (!portfolio || portfolio.length === 0) {
        return "<p>No investment data available.</p>";
    }

    const totalValue = portfolio.reduce((acc, item) => acc + item.amount, 0);
    const totalMonthlyPayout = portfolio.reduce((acc, item) => acc + calculateMonthlyPayout(item.amount, item.investmentType), 0);

    const rows = portfolio.map(item => `
        <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 8px;">
                <div style="font-weight: 500;">${item.investmentType.split(' - ')[0]}</div>
                <div style="font-size: 12px; color: #555;">${item.investmentType}</div>
                <div style="font-size: 12px; color: #555;">${item.createdAt.toLocaleDateString('en-GB')}</div>
            </td>
            <td style="padding: 8px; text-align: center;">${item.status}</td>
            <td style="padding: 8px; text-align: right;">${formatCurrency(item.amount)}</td>
            <td style="padding: 8px; text-align: right;">${formatCurrency(calculateMonthlyPayout(item.amount, item.investmentType))}</td>
        </tr>
    `).join('');

    return `
        <h3 style="color: #0A192F;">User's Portfolio Summary</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px; text-align: left;">
            <thead>
                <tr style="border-bottom: 2px solid #ddd;">
                    <th style="padding: 8px;">Investment</th>
                    <th style="padding: 8px; text-align: center;">Status</th>
                    <th style="padding: 8px; text-align: right;">Value</th>
                    <th style="padding: 8px; text-align: right;">Monthly Payout</th>
                </tr>
            </thead>
            <tbody>
                ${rows}
            </tbody>
            <tfoot>
                <tr style="border-top: 2px solid #ddd; font-weight: bold;">
                    <td style="padding: 8px;" colspan="2">Total (Approved)</td>
                    <td style="padding: 8px; text-align: right;">${formatCurrency(totalValue)}</td>
                    <td style="padding: 8px; text-align: right;">${formatCurrency(totalMonthlyPayout)}</td>
                </tr>
            </tfoot>
        </table>
    `;
};

const generateWithdrawalsHtml = (withdrawals: WithdrawalForEmail[]): string => {
    if (!withdrawals || withdrawals.length === 0) {
        return "<p>No withdrawal data available.</p>";
    }

    const rows = withdrawals.map(item => `
        <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 8px;">${item.createdAt.toLocaleDateString('en-GB')}</td>
            <td style="padding: 8px;">${item.withdrawalId}</td>
            <td style="padding: 8px; text-align: right;">${formatCurrency(item.amount)}</td>
            <td style="padding: 8px; text-align: right;">${formatCurrency(item.fee)}</td>
            <td style="padding: 8px; text-align: right; font-weight: 500;">${formatCurrency(item.payoutAmount)}</td>
            <td style="padding: 8px; text-align: center;">${item.status}</td>
        </tr>
    `).join('');

    return `
        <h3 style="color: #0A192F;">User's Withdrawal History</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px; text-align: left;">
            <thead>
                <tr style="border-bottom: 2px solid #ddd;">
                    <th style="padding: 8px;">Date</th>
                    <th style="padding: 8px;">ID</th>
                    <th style="padding: 8px; text-align: right;">Amount</th>
                    <th style="padding: 8px; text-align: right;">Fee</th>
                    <th style="padding: 8px; text-align: right;">Payout</th>
                    <th style="padding: 8px; text-align: center;">Status</th>
                </tr>
            </thead>
            <tbody>
                ${rows}
            </tbody>
        </table>
    `;
}

const createFullReportExcel = (user: UserDetailsForEmail, investments: InvestmentForEmail[], withdrawals: WithdrawalForEmail[]): Buffer => {
    const wb = XLSX.utils.book_new();

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


export async function sendAdminNewUserEmail(user: UserDetailsForEmail): Promise<void> {
    try {
        await resend.emails.send({
            from: FROM_NAME_EMAIL,
            to: ADMIN_EMAIL,
            subject: `New User Registration: ${user.fullName}`,
            html: `
                <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
                    <div style="max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
                        <h2 style="color: #0A192F;">New User Registration</h2>
                        <p>A new user has created an account on the platform.</p>
                        
                        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                        
                        <h3>User Details</h3>
                        <ul>
                            <li><strong>Full Name:</strong> ${user.fullName}</li>
                            <li><strong>Email Address:</strong> ${user.email}</li>
                            <li><strong>WhatsApp Number:</strong> ${user.whatsappNumber}</li>
                        </ul>

                        <h3>User Bank Details</h3>
                        <ul>
                            <li><strong>Bank Name:</strong> ${user.bankName}</li>
                            <li><strong>Account Name:</strong> ${user.accountName}</li>
                            <li><strong>Account Number:</strong> ${user.accountNumber}</li>
                        </ul>
                        
                        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                        <p style="font-size: 12px; color: #999;">This is an automated notification from the GOD IS ABLE GLOBAL LINK platform.</p>
                    </div>
                </div>
            `,
        });
        console.log(`New user notification sent for ${user.email} to ${ADMIN_EMAIL}`);
    } catch (error) {
        console.error('Error sending new user admin notification:', error);
    }
}

export async function sendWelcomeEmail(email: string, name: string): Promise<void> {
  const firstName = name.split(' ')[0] || name;

  try {
    await resend.emails.send({
      from: FROM_NAME_EMAIL,
      to: ADMIN_EMAIL, // For development, send all emails to admin
      subject: `Welcome to GOD IS ABLE GLOBAL LINK! (For User: ${email})`,
      html: `
        <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
            <p style="font-size: 12px; color: #999; background-color: #f0f0f0; padding: 5px; border-radius: 3px;">This is a development email originally intended for ${email}.</p>
            <h2 style="color: #0A192F;">Welcome to GOD IS ABLE GLOBAL LINK!</h2>
            <p>Hi ${firstName},</p>
            <p>We are thrilled to have you on board. Your personalized investment dashboard is now ready.</p>
            <p>Click the button below to log in and start tracking your portfolio, view performance charts, and stay on top of your investments.</p>
            <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://studiopreview-6frnii43o5blcu522sivebzpii.web.app'}" style="display: inline-block; background-color: #3498DB; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0;">Log In Now</a>
            <p>If you have any questions, feel free to reach out to our support team.</p>
            <br/>
            <p>Happy investing!</p>
            <p><strong>The GOD IS ABLE GLOBAL LINK Team</strong></p>
          </div>
        </div>
      `,
    });
    console.log(`Welcome email for ${email} sent to ${ADMIN_EMAIL}`);
  } catch (error) {
    console.error('Error sending welcome email:', error);
  }
}

export async function sendInvestmentNotificationEmail({ user, newInvestment, portfolio }: { user: UserDetailsForEmail, newInvestment: NewInvestmentDetails, portfolio: InvestmentForEmail[] }): Promise<void> {
  const formattedAmount = formatCurrency(newInvestment.amount);
  const portfolioHtml = generatePortfolioHtml(portfolio);
  const excelAttachment = createFullReportExcel(user, portfolio, []);

  try {
    await resend.emails.send({
      from: FROM_NAME_EMAIL,
      to: ADMIN_EMAIL,
      subject: `New Investment from ${user.fullName}`,
      html: `
        <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
            <h2 style="color: #0A192F;">New Investment Notification</h2>
            <p>A new investment has been made. Please find the details below and the comprehensive report attached.</p>
            
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
            
            <h3>New Investment Details</h3>
            <ul>
              <li><strong>Inv. ID:</strong> ${newInvestment.id}</li>
              <li><strong>Investment Type:</strong> ${newInvestment.type}</li>
              <li><strong>Amount:</strong> ${formattedAmount}</li>
              <li><strong>Investment Date:</strong> ${newInvestment.date} (UTC)</li>
              <li><strong>Status:</strong> Pending</li>
            </ul>

            <h3>User Details</h3>
            <ul>
              <li><strong>Full Name:</strong> ${user.fullName}</li>
              <li><strong>Email Address:</strong> ${user.email}</li>
              <li><strong>WhatsApp Number:</strong> ${user.whatsappNumber}</li>
            </ul>

            <h3>User Bank Details</h3>
            <ul>
                <li><strong>Bank Name:</strong> ${user.bankName}</li>
                <li><strong>Account Name:</strong> ${user.accountName}</li>
                <li><strong>Account Number:</strong> ${user.accountNumber}</li>
            </ul>
            
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">

            ${portfolioHtml}

            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 12px; color: #999;">This is an automated notification from the GOD IS ABLE GLOBAL LINK platform.</p>
          </div>
        </div>
      `,
      attachments: [
        {
          filename: `Investment_Report_${user.fullName.replace(/\s/g, '_')}.xlsx`,
          content: excelAttachment,
        }
      ]
    });
    console.log(`Investment notification sent for user ${user.email} to ${ADMIN_EMAIL}`);
  } catch (error) {
    console.error('Error sending investment notification email:', error);
  }
}

export async function sendInvestmentUpdateEmail({ user, investment, newStatus }: { user: UserDetailsForEmail, investment: InvestmentDetailsForEmail, newStatus: 'Approved' | 'Rejected' }): Promise<void> {
    const statusColor = newStatus === 'Approved' ? '#2ECC71' : '#E74C3C';
    
    const investmentDate = investment.date instanceof Date 
        ? investment.date.toLocaleString('en-GB', { timeZone: 'UTC' }) 
        : new Date(investment.date).toLocaleString('en-GB', { timeZone: 'UTC' });

    try {
        // Send notification to admin as a record of the action
        await resend.emails.send({
            from: FROM_NAME_EMAIL,
            to: ADMIN_EMAIL,
            subject: `ACTION: Investment #${investment.id} for ${user.fullName} was ${newStatus}`,
            html: `
                <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
                    <h2 style="color: #0A192F;">Admin Action: Investment Status Updated</h2>
                    <p>This is a notification that an investment has been updated by an admin.</p>
                    
                    <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; border-left: 5px solid ${statusColor};">
                        <p style="margin: 0; font-size: 16px;">
                            The investment for <strong>${user.fullName}</strong> was marked as 
                            <strong style="color: ${statusColor};">${newStatus}</strong>.
                        </p>
                    </div>

                    <h3>Investment Details</h3>
                    <ul>
                        <li><strong>Inv. ID:</strong> #${investment.id}</li>
                        <li><strong>Amount:</strong> ${formatCurrency(investment.amount)}</li>
                        <li><strong>Type:</strong> ${investment.type}</li>
                        <li><strong>Investment Date:</strong> ${investmentDate}</li>
                    </ul>

                    <h3>User Details</h3>
                    <ul>
                        <li><strong>Full Name:</strong> ${user.fullName}</li>
                        <li><strong>Email Address:</strong> ${user.email}</li>
                    </ul>

                    <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="font-size: 12px; color: #999;">This is an automated notification from the GOD IS ABLE GLOBAL LINK platform.</p>
                </div>
                </div>
            `,
        });

        // Send notification to user
        await resend.emails.send({
            from: FROM_NAME_EMAIL,
            to: ADMIN_EMAIL, // For development, send all emails to admin
            subject: `Investment Status Update (For User: ${user.email})`,
            html: `
                <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
                    <p style="font-size: 12px; color: #999; background-color: #f0f0f0; padding: 5px; border-radius: 3px;">This is a development email originally intended for ${user.email}.</p>
                    <h2 style="color: #0A192F;">Investment Status Updated</h2>
                    <p>Hello ${user.fullName},</p>
                    <p>This is to inform you that your investment (#${investment.id}) has been <strong style="color: ${statusColor};">${newStatus}</strong>.</p>
                    <p>You can view the details by logging into your dashboard.</p>
                    <br/>
                    <p>Thank you,</p>
                    <p><strong>The GOD IS ABLE GLOBAL LINK Team</strong></p>
                </div>
                </div>
            `,
        });


        console.log(`Investment update notification sent for user ${user.email} to admin and user.`);
    } catch (error) {
        console.error('Error sending investment update notification email:', error);
    }
}

export async function sendWithdrawalRequestEmail({ user, withdrawal }: { user: UserDetailsForEmail, withdrawal: {id: string, amount: number, fee: number, payoutAmount: number, date: string} }): Promise<void> {

    try {
        await resend.emails.send({
            from: FROM_NAME_EMAIL,
            to: ADMIN_EMAIL,
            subject: `Withdrawal Request (#${withdrawal.id}) from ${user.fullName}`,
            html: `
                <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
                    <h2 style="color: #0A192F;">Withdrawal Request</h2>
                    <p>A user has requested a withdrawal. Please review the details below and take the necessary action.</p>
                    
                    <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                    
                    <h3>Withdrawal Details</h3>
                    <ul>
                    <li><strong>Request ID:</strong> #${withdrawal.id}</li>
                    <li><strong>Requested Amount:</strong> ${formatCurrency(withdrawal.amount)}</li>
                    <li style="color: #E74C3C;"><strong>Management Fee (2%):</strong> ${formatCurrency(withdrawal.fee)}</li>
                    <li style="font-weight: bold;"><strong>Final Payout Amount:</strong> ${formatCurrency(withdrawal.payoutAmount)}</li>
                    <li><strong>Request Date:</strong> ${withdrawal.date} (UTC)</li>
                    </ul>

                    <h3>User Details</h3>
                    <ul>
                    <li><strong>Full Name:</strong> ${user.fullName}</li>
                    <li><strong>Email Address:</strong> ${user.email}</li>
                    </ul>

                    <h3>User Bank Account for Payout</h3>
                    <ul>
                        <li><strong>Bank Name:</strong> ${user.bankName}</li>
                        <li><strong>Account Name:</strong> ${user.accountName}</li>
                        <li><strong>Account Number:</strong> ${user.accountNumber}</li>
                    </ul>

                    <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="font-size: 12px; color: #999;">This is an automated notification from the GOD IS ABLE GLOBAL LINK platform.</p>
                </div>
                </div>
            `,
        });
        console.log(`Withdrawal notification sent for user ${user.email} to ${ADMIN_EMAIL}`);
    } catch (error) {
        console.error('Error sending withdrawal notification email:', error);
    }
}

export async function sendWithdrawalUpdateEmail({ user, withdrawal, newStatus }: { user: UserDetailsForEmail, withdrawal: WithdrawalDetailsForEmail, newStatus: 'Completed' | 'Rejected' }): Promise<void> {
    const statusColor = newStatus === 'Completed' ? '#2ECC71' : '#E74C3C';
    
    const withdrawalDate = withdrawal.date instanceof Date 
        ? withdrawal.date.toLocaleString('en-GB', { timeZone: 'UTC' }) 
        : new Date(withdrawal.date).toLocaleString('en-GB', { timeZone: 'UTC' });

    const payoutDetailsHtml = newStatus === 'Completed'
        ? `<li><strong>Payout Amount:</strong> ${formatCurrency(withdrawal.payoutAmount)}</li>`
        : '';

    try {
        // Send notification to admin as a record of the action
        await resend.emails.send({
            from: FROM_NAME_EMAIL,
            to: ADMIN_EMAIL,
            subject: `ACTION: Withdrawal #${withdrawal.id} for ${user.fullName} was ${newStatus}`,
            html: `
                <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
                    <h2 style="color: #0A192F;">Admin Action: Withdrawal Status Updated</h2>
                    <p>This is a notification that a withdrawal request has been updated by an admin.</p>
                    
                    <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; border-left: 5px solid ${statusColor};">
                        <p style="margin: 0; font-size: 16px;">
                            The withdrawal request for <strong>${user.fullName}</strong> was marked as 
                            <strong style="color: ${statusColor};">${newStatus}</strong>.
                        </p>
                    </div>

                    <h3>Withdrawal Details</h3>
                    <ul>
                        <li><strong>Request ID:</strong> #${withdrawal.id}</li>
                        <li><strong>Requested Amount:</strong> ${formatCurrency(withdrawal.amount)}</li>
                        ${payoutDetailsHtml}
                        <li><strong>Request Date:</strong> ${withdrawalDate}</li>
                    </ul>

                    <h3>User Details</h3>
                    <ul>
                        <li><strong>Full Name:</strong> ${user.fullName}</li>
                        <li><strong>Email Address:</strong> ${user.email}</li>
                    </ul>

                    <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="font-size: 12px; color: #999;">This is an automated notification from the GOD IS ABLE GLOBAL LINK platform.</p>
                </div>
                </div>
            `,
        });

        // Send notification to the user
        await resend.emails.send({
            from: FROM_NAME_EMAIL,
            to: ADMIN_EMAIL, // For development, send all emails to admin
            subject: `Withdrawal Status Update (For User: ${user.email})`,
            html: `
                <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
                    <p style="font-size: 12px; color: #999; background-color: #f0f0f0; padding: 5px; border-radius: 3px;">This is a development email originally intended for ${user.email}.</p>
                    <h2 style="color: #0A192F;">Withdrawal Status Updated</h2>
                    <p>Hello ${user.fullName},</p>
                    <p>This is to inform you that your withdrawal request (#${withdrawal.id}) has been <strong style="color: ${statusColor};">${newStatus}</strong>.</p>
                     ${newStatus === 'Completed'
                        ? `<p>The amount of ${formatCurrency(withdrawal.payoutAmount)} has been processed and should reflect in your bank account shortly.</p>`
                        : `<p>If you have any questions, please contact our support team.</p>`
                    }
                    <br/>
                    <p>Thank you,</p>
                    <p><strong>The GOD IS ABLE GLOBAL LINK Team</strong></p>
                </div>
                </div>
            `,
        });


        console.log(`Withdrawal update notification sent for user ${user.email} to admin and user.`);
    } catch (error) {
        console.error('Error sending withdrawal update notification email:', error);
    }
}


export async function sendFullPortfolioReportEmail({ user, investments, withdrawals }: { user: UserDetailsForEmail, investments: InvestmentForEmail[], withdrawals: WithdrawalForEmail[] }): Promise<void> {
  const investmentsHtml = generatePortfolioHtml(investments);
  const withdrawalsHtml = generateWithdrawalsHtml(withdrawals);
  const excelAttachment = createFullReportExcel(user, investments, withdrawals);

  try {
    await resend.emails.send({
      from: FROM_NAME_EMAIL,
      to: ADMIN_EMAIL,
      subject: `Full Historical Report for ${user.fullName}`,
      html: `
        <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
            <h2 style="color: #0A192F;">Full Historical Report</h2>
            <p>This is a complete historical data report for the user requested via the admin tools. The full data is also attached as an Excel file.</p>
            
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">

            <h3>User Details</h3>
            <ul>
              <li><strong>Full Name:</strong> ${user.fullName}</li>
              <li><strong>Email Address:</strong> ${user.email}</li>
              <li><strong>WhatsApp Number:</strong> ${user.whatsappNumber}</li>
            </ul>

            <h3>User Bank Details</h3>
            <ul>
                <li><strong>Bank Name:</strong> ${user.bankName}</li>
                <li><strong>Account Name:</strong> ${user.accountName}</li>
                <li><strong>Account Number:</strong> ${user.accountNumber}</li>
            </ul>
            
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">

            ${investmentsHtml}

            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">

            ${withdrawalsHtml}

            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 12px; color: #999;">This is an automated notification from the GOD IS ABLE GLOBAL LINK platform.</p>
          </div>
        </div>
      `,
      attachments: [
        {
          filename: `Full_Report_${user.fullName.replace(/\s/g, '_')}.xlsx`,
          content: excelAttachment,
        }
      ]
    });
    console.log(`Full historical report sent for user ${user.email} to ${ADMIN_EMAIL}`);
  } catch (error) {
    console.error('Error sending full portfolio report email:', error);
  }
}


export async function sendUserStatusUpdateEmail({ user, newStatus }: { user: UserDetailsForEmail, newStatus: boolean }): Promise<void> {
    const statusText = newStatus ? 'Activated' : 'Deactivated';
    const statusColor = newStatus ? '#2ECC71' : '#E74C3C';

    try {
        // Send notification to admin
        await resend.emails.send({
            from: FROM_NAME_EMAIL,
            to: ADMIN_EMAIL,
            subject: `ACTION: User Account ${statusText}: ${user.fullName}`,
            html: `
                <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
                    <h2 style="color: #0A192F;">Admin Action: User Account Status Changed</h2>
                    <p>An administrator has changed the status of a user account.</p>
                    
                    <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; border-left: 5px solid ${statusColor};">
                        <p style="margin: 0; font-size: 16px;">
                            The account for <strong>${user.fullName}</strong> has been 
                            <strong style="color: ${statusColor};">${statusText}</strong>.
                        </p>
                    </div>

                    <h3>User Details</h3>
                    <ul>
                        <li><strong>Full Name:</strong> ${user.fullName}</li>
                        <li><strong>Email Address:</strong> ${user.email}</li>
                    </ul>

                    <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="font-size: 12px; color: #999;">This is an automated notification from the GOD IS ABLE GLOBAL LINK platform.</p>
                </div>
                </div>
            `,
        });

        // Send notification to the user
        await resend.emails.send({
            from: FROM_NAME_EMAIL,
            to: ADMIN_EMAIL, // For development, send all emails to admin
            subject: `Your Account has been ${statusText} (For User: ${user.email})`,
            html: `
                <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
                    <p style="font-size: 12px; color: #999; background-color: #f0f0f0; padding: 5px; border-radius: 3px;">This is a development email originally intended for ${user.email}.</p>
                    <h2 style="color: #0A192F;">Your Account Status has Changed</h2>
                    <p>Hello ${user.fullName},</p>
                    <p>This is to inform you that your account on the GOD IS ABLE GLOBAL LINK platform has been <strong style="color: ${statusColor};">${statusText}</strong> by an administrator.</p>
                    ${newStatus 
                        ? "<p>You can now log in and access all features of your account.</p>" 
                        : "<p>If you believe this was in error, or if you have any questions, please contact our support team through the official WhatsApp group.</p>"
                    }
                    <br/>
                    <p>Thank you,</p>
                    <p><strong>The GOD IS ABLE GLOBAL LINK Team</strong></p>
                </div>
                </div>
            `,
        });

        console.log(`User status update notification sent for ${user.email} to admin and user.`);
    } catch (error) {
        console.error('Error sending user status update notification email:', error);
    }
}
