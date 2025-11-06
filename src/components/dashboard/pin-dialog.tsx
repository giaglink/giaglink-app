"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { setWithdrawalPin, verifyWithdrawalPin } from "@/app/dashboard/withdrawal/actions";
import { doc, setDoc } from "firebase/firestore";


import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";


// --- Zod Schemas ---
const setPinSchema = z.object({
    pin: z.string().length(4, "PIN must be exactly 4 digits."),
    confirmPin: z.string().length(4, "PIN must be exactly 4 digits."),
}).refine((data) => data.pin === data.confirmPin, {
    message: "PINs do not match.",
    path: ["confirmPin"],
});

const verifyPinSchema = z.object({
  pin: z.string().min(1, "PIN is required."),
});

type SetPinFormValues = z.infer<typeof setPinSchema>;
type VerifyPinFormValues = z.infer<typeof verifyPinSchema>;


// --- Main Component ---
interface PinDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function PinDialog({ open, onOpenChange, onSuccess }: PinDialogProps) {
  const [user] = useAuthState(auth);
  const { toast } = useToast();
  const [mode, setMode] = useState<"loading" | "verify" | "set">("loading");

  const setPinForm = useForm<SetPinFormValues>({
    resolver: zodResolver(setPinSchema),
    defaultValues: { pin: "", confirmPin: "" },
  });

  const verifyPinForm = useForm<VerifyPinFormValues>({
    resolver: zodResolver(verifyPinSchema),
    defaultValues: { pin: "" },
  });

  // Check if user has a PIN when the dialog opens
  useEffect(() => {
    async function checkPinStatus() {
        if (user) {
            setMode("loading");
            // We use the client-side `getDoc` here which is less secure but avoids serverless cold starts
            // and permission issues with server actions for this simple check.
            // The verification itself is done securely on the server.
            const userDocRef = doc(db, 'users', user.uid);
            const userDoc = await import("firebase/firestore").then(m => m.getDoc(userDocRef));
            const pinExists = !!userDoc.data()?.withdrawalPin;
            setMode(pinExists ? "verify" : "set");
        }
    }
    if (open) {
      checkPinStatus();
      setPinForm.reset();
      verifyPinForm.reset();
    }
  }, [open, user, setPinForm, verifyPinForm]);

  const handleSetPin = async (values: SetPinFormValues) => {
    if (!user) return;
    
    // Call server action to securely hash and save the PIN
    const result = await setWithdrawalPin(user.uid, values.pin);
    
    if (result.success) {
        toast({ title: "PIN Set Successfully", description: "You can now authorize your withdrawal." });
        setMode("verify"); // Switch to verification mode
        verifyPinForm.reset(); // Clear verify form
    } else {
        toast({ title: "Error", description: result.message || "Failed to set PIN.", variant: "destructive" });
    }
  };

  const handleVerifyPin = async (values: VerifyPinFormValues) => {
    if (!user) return;

    if (values.pin.length !== 4) {
        verifyPinForm.setError("pin", { type: "manual", message: "PIN must be exactly 4 digits." });
        return;
    }

    const isValid = await verifyWithdrawalPin(user.uid, values.pin);

    if (isValid) {
      toast({ title: "PIN Verified", description: "Your withdrawal is being processed." });
      onSuccess(); // Callback to proceed with withdrawal
      onOpenChange(false); // Close dialog
    } else {
      verifyPinForm.setError("pin", { type: "manual", message: "Incorrect PIN. Please try again." });
    }
  };
  
  const handleForgotPin = () => {
    toast({
        title: "Forgot PIN",
        description: "Please contact Admin via our WhatsApp group to reset your PIN.",
        duration: 8000,
    })
  }

  const getTitle = () => {
    switch (mode) {
      case 'loading': return 'Loading...';
      case 'set': return 'Create Withdrawal PIN';
      case 'verify': return 'Enter PIN to Authorize';
    }
  }

  const renderContent = () => {
    switch (mode) {
      case "loading":
        return <div className="py-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;

      case "set":
        return (
          <>
            <DialogDescription>
              Set a 4-digit PIN to secure your withdrawals. You will need this for all future transactions.
            </DialogDescription>
            <Form {...setPinForm}>
              <form onSubmit={setPinForm.handleSubmit(handleSetPin)} className="space-y-4 py-4">
                <FormField
                  control={setPinForm.control}
                  name="pin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New 4-Digit PIN</FormLabel>
                      <FormControl>
                        <Input type="password" maxLength={4} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={setPinForm.control}
                  name="confirmPin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm New PIN</FormLabel>
                      <FormControl>
                        <Input type="password" maxLength={4} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                  <Button type="submit" disabled={setPinForm.formState.isSubmitting}>
                    {setPinForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Set PIN
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </>
        );

      case "verify":
        return (
          <>
            <DialogDescription>
              Enter your 4-digit PIN to complete the withdrawal request.
            </DialogDescription>
            <Form {...verifyPinForm}>
              <form onSubmit={verifyPinForm.handleSubmit(handleVerifyPin)} className="space-y-4 py-4">
                <FormField
                  control={verifyPinForm.control}
                  name="pin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>4-Digit PIN</FormLabel>
                      <FormControl>
                        <Input type="password" maxLength={4} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <div className="text-right">
                    <Button type="button" variant="link" size="sm" className="h-auto p-0" onClick={handleForgotPin}>
                        Forgot PIN?
                    </Button>
                 </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                  <Button type="submit" disabled={verifyPinForm.formState.isSubmitting}>
                    {verifyPinForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Authorize Withdrawal
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
        </DialogHeader>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}
