'use server';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResendNotificationsClient } from '@/components/admin/resend-notifications-client';
import { UserExportClient } from "@/components/admin/user-export-client";
import { Separator } from "@/components/ui/separator";

// --- Page Component ---
export default async function AdminToolsPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <Card>
        <CardHeader>
          <CardTitle>Administrative Tools</CardTitle>
          <CardDescription>
            Use these tools for bulk actions and system maintenance. Please use with caution.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <ResendNotificationsClient />
          <Separator />
          <UserExportClient />
        </CardContent>
      </Card>
    </div>
  );
}
