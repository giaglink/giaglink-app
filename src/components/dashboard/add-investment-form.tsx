"use client"

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Info, Loader2 } from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { collection, doc, serverTimestamp, getDoc, Timestamp, query, getDocs, setDoc, orderBy } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { useLoading } from "@/contexts/loading-context";
import { sendInvestmentNotificationEmail } from "@/services/email";
import type { UserDetailsForEmail, InvestmentForEmail } from "@/services/email";
import { initializePaystackTransaction } from "@/app/actions/paystack";

const investmentTypes = {
    "Moderate - 20% Monthly": {
        min: 50000,
        max: 5000000,
        roi: "20% Monthly RoI",
        tenure: "12 months tenure",
        window: "Add Investment ONLY 1st - 2nd of every month",
        payout: "Payout on 1st - 2nd of every month",
        refund: "No Capital refund",
        refundLoss: ""
    }
};

type InvestmentPlanKey = keyof typeof investmentTypes;

const formSchema = z.object({
  investmentType: z.string().min(1, "Please select an investment type."),
  amount: z.coerce.number(),
}).superRefine((data, ctx) => {
    if (!data.investmentType) return;

    const plan = investmentTypes[data.investmentType as InvestmentPlanKey];
    if (!plan) return;
    
    const minFormatted = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(plan.min);
    const maxFormatted = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(plan.max);
    
    if (data.amount < plan.min) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['amount'],
            message: `Amount must be at least ${minFormatted}.`,
        });
    }

    if (data.amount > plan.max) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['amount'],
            message: `Amount cannot exceed ${maxFormatted}.`,
        });
    }

    if (data.amount <= 0) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['amount'],
            message: `Please enter a valid amount.`,
        });
    }
});


type AddInvestmentFormValues = z.infer<typeof formSchema>;

export function AddInvestmentForm({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const [user] = useAuthState(auth);
  const { setIsLoading } = useLoading();
  
  const form = useForm<AddInvestmentFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      investmentType: "",
      amount: undefined,
    },
    mode: 'onChange',
  });

  const { formState: { isSubmitting }, watch } = form;

  const selectedInvestmentType = watch("investmentType");
  const selectedTerms = selectedInvestmentType ? investmentTypes[selectedInvestmentType as InvestmentPlanKey] : null;

  async function onSubmit(values: AddInvestmentFormValues) {
    if (!user || !user.email) {
        toast({
            title: "Authentication Error",
            description: "You must be logged in to add an investment.",
            variant: "destructive",
        });
        return;
    }
    
    setIsLoading(true);

    try {
        const paymentResponse = await initializePaystackTransaction(user.email, values.amount);

        if (!paymentResponse.status || !paymentResponse.data) {
            throw new Error(paymentResponse.message || "Failed to initialize payment.");
        }

        const investmentDate = new Date();
        const userDocRef = doc(db, 'users', user.uid);
        
        const newInvestmentId = paymentResponse.data.reference;
        const newInvestmentRef = doc(collection(userDocRef, "investments"), newInvestmentId);

        await setDoc(newInvestmentRef, {
            investmentId: newInvestmentId,
            userId: user.uid,
            investmentType: values.investmentType,
            amount: values.amount,
            status: 'Pending', 
            createdAt: Timestamp.fromDate(investmentDate),
        });

        const investmentsQuery = query(collection(db, "users", user.uid, "investments"), orderBy("createdAt", "desc"));
        const [userDoc, investmentsSnapshot] = await Promise.all([
            getDoc(userDocRef),
            getDocs(investmentsQuery),
        ]);
        
        const userData = userDoc.data() as UserDetailsForEmail;

        const allInvestments: InvestmentForEmail[] = investmentsSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                investmentId: data.investmentId,
                investmentType: data.investmentType,
                amount: data.amount,
                status: data.status,
                createdAt: data.createdAt.toDate(),
            };
        });
        
        await sendInvestmentNotificationEmail({
            user: userData,
            newInvestment: {
                id: newInvestmentId,
                type: values.investmentType,
                amount: values.amount,
                date: investmentDate.toUTCString(),
            },
            portfolio: allInvestments
        });

        toast({
            title: "Redirecting to Payment",
            description: "You will now be redirected to our secure payment gateway.",
        });

        window.location.href = paymentResponse.data.authorization_url;

    } catch (error: any) {
        console.error("Error during investment submission: ", error);
        toast({
            title: "Error",
            description: error.message || "Could not process your investment. Please try again.",
            variant: "destructive"
        })
        setIsLoading(false); 
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
        <FormField
          control={form.control}
          name="investmentType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Choose Investment Type:</FormLabel>
              <Select onValueChange={(value: InvestmentPlanKey) => {
                  field.onChange(value);
                  const plan = investmentTypes[value];
                  if (plan) {
                    form.setValue("amount", plan.min, { shouldValidate: true });
                  }
              }} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an investment type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Object.keys(investmentTypes).map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        {selectedTerms && (
            <>
                <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Investment Terms</AlertTitle>
                    <AlertDescription>
                        <ul className="list-disc pl-5 space-y-1 mt-2">
                            <li>Minimum of {new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(selectedTerms.min)}</li>
                            <li>Maximum of {new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(selectedTerms.max)}</li>
                            <li>{selectedTerms.roi}</li>
                            <li>{selectedTerms.tenure}</li>
                            <li>{selectedTerms.window}</li>
                            <li>{selectedTerms.payout}</li>
                            {selectedTerms.refund && <li>{selectedTerms.refund}</li>}
                            {selectedTerms.refundLoss && <li>{selectedTerms.refundLoss}</li>}
                        </ul>
                    </AlertDescription>
                </Alert>
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Investment Amount (NGN)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g., 50000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </>
        )}
        <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
                Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !selectedInvestmentType}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Proceed to Payment
            </Button>
        </div>
      </form>
    </Form>
  );
}
