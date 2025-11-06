"use client"

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuthState } from "react-firebase-hooks/auth";
import { collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, Timestamp, where } from "firebase/firestore";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { auth, db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Banknote, Info, Loader2, AlertCircle } from "lucide-react";
import { Currency } from "@/components/ui/currency";
import type { UserDetailsForEmail } from "@/services/email";
import { sendWithdrawalRequestEmail } from "@/services/email";
import { Skeleton } from "../ui/skeleton";
import { getMonthlyPercentage } from "@/lib/investment-utils";
import type { Investment } from "@/lib/types";
import { PinDialog } from "./pin-dialog";

interface UserProfile extends UserDetailsForEmail {}

interface Withdrawal {
  id: string;
  amount: number;
  createdAt: Timestamp;
}

const formSchema = z.object({
  amount: z.coerce.number().min(2000, "Withdrawal amount must be at least ₦2,000."),
});

type WithdrawalFormValues = z.infer<typeof formSchema>;

interface WithdrawalFormProps {
    disabled?: boolean;
}

const MANAGEMENT_FEE_RATE = 0.02; // 2%
const ADMIN_EMAIL = 'godisablegloballink@gmail.com';

export function WithdrawalForm({ disabled = false }: WithdrawalFormProps) {
  const { toast } = useToast();
  const [user] = useAuthState(auth);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [availableForWithdrawal, setAvailableForWithdrawal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isPinDialogOpen, setIsPinDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const calculateMonthlyPayout = (investment: Investment): number => {
    const monthlyRate = getMonthlyPercentage(investment.investmentType) / 100;
    return investment.amount * monthlyRate;
  };

  const isUserAdmin = user?.email === ADMIN_EMAIL;

  useEffect(() => {
    async function fetchData() {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        // Fetch user profile
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
            const userData = userDoc.data();
            // Ensure createdAt is serialized before setting state
            if (userData.createdAt && userData.createdAt instanceof Timestamp) {
                userData.createdAt = userData.createdAt.toDate().toISOString();
            }
            setUserProfile(userData as UserProfile);
        }

        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();

        // Fetch investments to calculate total monthly payout
        const investmentsQuery = query(collection(db, "users", user.uid, "investments"));
        const investmentsSnapshot = await getDocs(investmentsQuery);
        const investmentsData = investmentsSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                ...data,
                id: doc.id,
                createdAt: (data.createdAt as Timestamp).toDate().toISOString() // Ensure createdAt is a string
            } as Investment;
        });
        
        // Filter investments made *before* the current month
        const eligibleInvestments = investmentsData.filter(inv => {
            const investmentDate = new Date(inv.createdAt);
            const investmentMonth = investmentDate.getMonth();
            const investmentYear = investmentDate.getFullYear();
            // Investment is eligible if it was made in a previous year OR in the current year but a previous month
            return investmentYear < currentYear || (investmentYear === currentYear && investmentMonth < currentMonth);
        });

        const totalMonthlyPayout = eligibleInvestments.reduce((sum, inv) => sum + calculateMonthlyPayout(inv), 0);
        
        // Fetch withdrawals made in the current month
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

        const withdrawalsQuery = query(
        collection(db, "users", user.uid, "withdrawals"),
        where("createdAt", ">=", startOfMonth),
        where("createdAt", "<=", endOfMonth)
        );
        const withdrawalsSnapshot = await getDocs(withdrawalsQuery);
        const withdrawalsData = withdrawalsSnapshot.docs.map(doc => doc.data() as Withdrawal);
        const totalWithdrawnThisMonth = withdrawalsData.reduce((sum, w) => sum + w.amount, 0);

        setAvailableForWithdrawal(totalMonthlyPayout - totalWithdrawnThisMonth);
      } catch (error) {
        console.error("Error fetching user data for withdrawal:", error);
        toast({
          title: "Error",
          description: "Could not fetch your profile or financial data.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user, toast]);
  
  const form = useForm<WithdrawalFormValues>({
    resolver: zodResolver(formSchema.superRefine((data, ctx) => {
        if (data.amount > availableForWithdrawal) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["amount"],
                message: `Withdrawal amount cannot exceed your available balance of ${new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(availableForWithdrawal)}.`,
            });
        }
    })),
    defaultValues: {
      amount: 0,
    },
  });

  const handleOpenPinDialog = () => {
    setIsPinDialogOpen(true);
  };
  
  async function onSubmit() {
    setIsProcessing(true);
    const values = form.getValues();

    if (!user || !userProfile) {
      toast({
        title: "Error",
        description: "You must be logged in and have a complete profile.",
        variant: "destructive"
      });
      setIsProcessing(false);
      return;
    }

    try {
        // Get the number of existing withdrawals to generate a new sequential ID
        const withdrawalsCollectionRef = collection(db, "users", user.uid, "withdrawals");
        const existingWithdrawalsSnapshot = await getDocs(withdrawalsCollectionRef);
        const withdrawalCount = existingWithdrawalsSnapshot.size;
        const newWithdrawalSerialId = (withdrawalCount + 1).toString();

        const withdrawalRef = doc(withdrawalsCollectionRef);
        
        const requestedAmount = values.amount;
        const managementFee = requestedAmount * MANAGEMENT_FEE_RATE;
        const payoutAmount = requestedAmount - managementFee;

        await setDoc(withdrawalRef, {
            withdrawalId: newWithdrawalSerialId,
            userId: user.uid,
            amount: requestedAmount,
            managementFee: managementFee,
            payoutAmount: payoutAmount,
            status: 'Pending',
            createdAt: serverTimestamp(),
        });
        
        await sendWithdrawalRequestEmail({
            user: userProfile,
            withdrawal: {
                id: newWithdrawalSerialId,
                amount: requestedAmount,
                fee: managementFee,
                payoutAmount: payoutAmount,
                date: new Date().toLocaleString('en-GB', { timeZone: 'UTC' }),
            }
        });

        // This toast is now shown from the PIN dialog on success
        // toast({
        //     title: "Withdrawal Request Submitted",
        //     description: "Your request has been received and is being processed.",
        // });

        // Update UI immediately for better UX
        setAvailableForWithdrawal(prev => prev - requestedAmount);
        form.reset({ amount: 0 });

    } catch (error) {
        console.error("Error submitting withdrawal request:", error);
        toast({
            title: "Submission Failed",
            description: "There was an error submitting your request. Please try again.",
            variant: "destructive",
        });
    } finally {
        setIsProcessing(false);
    }
  }

  const hasExceededLimit = availableForWithdrawal <= 0;
  const isFormDisabled = disabled || hasExceededLimit;

  if (loading) {
      return (
          <div className="space-y-4">
              <Skeleton className="h-24" />
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
          </div>
      )
  }

  return (
    <>
        <PinDialog 
            open={isPinDialogOpen}
            onOpenChange={setIsPinDialogOpen}
            onSuccess={onSubmit}
        />
        <div className="space-y-6">
            <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Available for Withdrawal (This Month)</AlertTitle>
                <AlertDescription className="font-mono text-xl font-bold text-primary">
                    <Currency value={availableForWithdrawal > 0 ? availableForWithdrawal : 0} />
                </AlertDescription>
            </Alert>

            {userProfile && (
                <div className="space-y-4">
                    <h3 className="font-semibold text-lg flex items-center">
                        <Banknote className="mr-2 h-5 w-5" />
                        Payout Bank Account
                    </h3>
                    <div className="grid grid-cols-3 gap-4 p-4 border rounded-lg bg-muted/30">
                        <div className="col-span-1 text-sm text-muted-foreground">Bank Name</div>
                        <div className="col-span-2 font-medium">{userProfile.bankName}</div>

                        <div className="col-span-1 text-sm text-muted-foreground">Account Name</div>
                        <div className="col-span-2 font-medium">{userProfile.accountName}</div>
                        
                        <div className="col-span-1 text-sm text-muted-foreground">Account Number</div>
                        <div className="col-span-2 font-medium font-mono">{userProfile.accountNumber}</div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        This is the account your withdrawal will be sent to. If this is incorrect, please contact Admin via our WhatsApp group to update your details.
                    </p>
                </div>
            )}

            {hasExceededLimit && !disabled && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Monthly Limit Reached</AlertTitle>
                    <AlertDescription>
                        You have withdrawn your full available balance for this month. Please check back next month.
                    </AlertDescription>
                </Alert>
            )}

            <Form {...form}>
                <form onSubmit={form.handleSubmit(handleOpenPinDialog)} className="space-y-4">
                    <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Withdrawal Amount (NGN)</FormLabel>
                        <FormControl>
                            <Input type="number" placeholder="e.g., 10000" {...field} disabled={isFormDisabled} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <Alert variant="default">
                        <Info className="h-4 w-4" />
                        <AlertTitle>Management Fee</AlertTitle>
                        <AlertDescription>
                            A 2% management fee will be deducted from the withdrawal amount.
                        </AlertDescription>
                    </Alert>
                    <div className="flex justify-end pt-4">
                        <Button type="submit" disabled={isFormDisabled || isProcessing}>
                        {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Submit Request
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    </>
  );
}
