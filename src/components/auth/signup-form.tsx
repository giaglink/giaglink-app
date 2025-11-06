"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Eye, EyeOff, UserPlus, Phone, User, Loader2, Landmark, Wallet } from "lucide-react";
import Link from "next/link";
import { createUserWithEmailAndPassword, fetchSignInMethodsForEmail } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/logo";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "../ui/alert";
import { sendWelcomeEmail, sendAdminNewUserEmail } from "@/services/email";


const formSchema = z.object({
  fullName: z.string().min(1, {
    message: "Full name is required.",
  }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  whatsappNumber: z.string().min(1, {
    message: "WhatsApp number is required.",
  }),
  password: z.string()
    .min(8, { message: "Password must be at least 8 characters long." })
    .regex(/\d/, { message: "Password must contain at least one number." })
    .regex(/[^a-zA-Z0-9]/, { message: "Password must contain at least one special character." }),
  bankName: z.string().min(1, "Bank name is required."),
  accountName: z.string().min(1, "Account name is required."),
  accountNumber: z.string().regex(/^\d{10}$/, "Please enter a valid 10-digit account number."),
});

export function SignupForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      email: "",
      whatsappNumber: "",
      password: "",
      bankName: "",
      accountName: "",
      accountNumber: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      // Check if email already exists
      const signInMethods = await fetchSignInMethodsForEmail(auth, values.email);
      if (signInMethods.length > 0) {
        toast({
          title: "Signup Failed",
          description: "An account with this email already exists. Please sign in.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      // 1. Create user with Firebase Auth on the client
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;

      // 2. Save user data to Firestore from the client
      const userDocRef = doc(db, "users", user.uid);
      await setDoc(userDocRef, {
            uid: user.uid,
            fullName: values.fullName,
            email: values.email,
            whatsappNumber: values.whatsappNumber,
            bankName: values.bankName,
            accountName: values.accountName,
            accountNumber: values.accountNumber,
            createdAt: serverTimestamp(),
            isAdmin: false,
      });

      // 3. Call server action to send welcome email and admin notification
      await sendWelcomeEmail(values.email, values.fullName);
      await sendAdminNewUserEmail({
          fullName: values.fullName,
          email: values.email,
          whatsappNumber: values.whatsappNumber,
          bankName: values.bankName,
          accountName: values.accountName,
          accountNumber: values.accountNumber,
      });

      toast({
        title: "Account Created!",
        description: "Your account has been successfully created. Please log in.",
      });
      router.push("/");

    } catch (error: any) {
      console.error("Error during signup process:", error);
      let errorMessage = "An unexpected error occurred. Please try again.";
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = "An account with this email already exists. Please sign in.";
      } else if (error.code === 'auth/weak-password' || error.code === 'auth/password-does-not-meet-requirements') {
        errorMessage = "Password does not meet requirements. It must be at least 8 characters long and include a number and a special character.";
      }
      toast({
        title: "Signup Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <Card className="w-full max-w-md my-8">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4">
          <Logo large />
        </div>
        <CardTitle className="font-headline text-2xl">Create an Account</CardTitle>
        <CardDescription>
          Enter your details to get started.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input placeholder="John Doe" {...field} />
                      <User className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="name@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="whatsappNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>WhatsApp Number</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input placeholder="+1234567890" {...field} />
                      <Phone className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
                control={form.control}
                name="bankName"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Bank Name</FormLabel>
                        <FormControl>
                            <div className="relative">
                                <Input placeholder="e.g., Guaranty Trust Bank" {...field} />
                                <Landmark className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            </div>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
             <FormField
                control={form.control}
                name="accountName"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Account Name</FormLabel>
                        <FormControl>
                            <div className="relative">
                                <Input placeholder="As it appears on your bank account" {...field} />
                                <User className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            </div>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="accountNumber"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Account Number</FormLabel>
                        <FormControl>
                            <div className="relative">
                                <Input type="number" placeholder="0123456789" {...field} />
                                <Wallet className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            </div>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        {...field}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute inset-y-0 right-0 h-full px-3"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Alert variant="default" className="text-xs">
                <AlertDescription>
                    Password must be at least 8 characters and contain one number and one special character.
                </AlertDescription>
            </Alert>
            <Button type="submit" className="w-full !mt-6 bg-primary-light text-primary-light-foreground hover:bg-primary-light/90" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="mr-2 h-4 w-4" />
              )}
              Sign Up
            </Button>
          </form>
        </Form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/" className="font-semibold text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
