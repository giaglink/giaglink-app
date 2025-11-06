"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, AlertTriangle, Search } from 'lucide-react';
import { resendUserNotification } from '@/app/admin/tools/actions';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

const formSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }),
});

type FormValues = z.infer<typeof formSchema>;

export function ResendNotificationsClient() {
  const { toast } = useToast();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: '' },
  });

  const { isSubmitting } = form.formState;

  const handleResendClick = async (values: FormValues) => {
    // The confirm() dialog was disrupting the form's state.
    // A confirmation should be handled with a proper AlertDialog component if needed.
    // For now, we remove it to fix the button's functionality.

    try {
      const result = await resendUserNotification(values);
      if (result.success) {
        toast({
          title: 'Report Sent',
          description: result.message,
        });
        form.reset();
      } else {
        toast({
          title: 'Error',
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to execute resend action:', error);
      toast({
        title: 'Client-side Error',
        description: 'An unexpected error occurred while trying to start the process.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Warning: High-Volume Action</AlertTitle>
        <AlertDescription>
          This tool will send a comprehensive email containing a user's entire investment and withdrawal history to the admin email address. Use this for generating complete reports.
        </AlertDescription>
      </Alert>

      <div>
        <h3 className="font-semibold mb-2">Resend Full User Report</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Enter a user's email to send their full historical portfolio report to the admin address (`godisablegloballink@gmail.com`).
        </p>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleResendClick)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>User Email</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="user@example.com" {...field} className="pl-8" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end">
                <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <Mail className="mr-2 h-4 w-4" />
                )}
                {isSubmitting ? 'Sending...' : 'Send Report'}
                </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
