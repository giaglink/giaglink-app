"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Currency } from "@/components/ui/currency";
import { Button } from "@/components/ui/button";
import { Loader2, ThumbsUp, ThumbsDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { updateInvestmentStatusAndNotify } from "@/app/admin/investments/actions";
import type { InvestmentWithUser } from "@/app/admin/investments/page";
import { Badge } from "@/components/ui/badge";

interface AdminInvestmentsClientProps {
  initialInvestments: InvestmentWithUser[];
}

export function AdminInvestmentsClient({ initialInvestments }: AdminInvestmentsClientProps) {
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const { toast } = useToast();
  const router = useRouter();

  const handleUpdateStatus = async (userId: string, investmentId: string, newStatus: 'Approved' | 'Rejected') => {
    setLoadingStates(prev => ({ ...prev, [investmentId]: true }));
    try {
      const result = await updateInvestmentStatusAndNotify({ userId, investmentId, newStatus });
      if (result.success) {
        toast({
          title: "Status Updated",
          description: result.message,
        });
        router.refresh(); 
      } else {
        toast({
          title: "Update Failed",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
        setLoadingStates(prev => ({ ...prev, [investmentId]: false }));
    }
  };


  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  const getStatusBadgeVariant = (status: InvestmentWithUser['status']) => {
    switch (status) {
      case 'Approved': return 'default';
      case 'Pending': return 'secondary';
      case 'Rejected': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Investment Type</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Amount (NGN)</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {initialInvestments.length > 0 ? (
            initialInvestments.map((inv) => (
              <TableRow key={inv.id}>
                <TableCell className="font-medium">{inv.user?.fullName || 'Unknown User'}</TableCell>
                <TableCell>{inv.investmentType}</TableCell>
                <TableCell>{formatDate(inv.createdAt)}</TableCell>
                <TableCell className="font-mono">
                  <Currency value={inv.amount} />
                </TableCell>
                 <TableCell>
                    <Badge variant={getStatusBadgeVariant(inv.status)}>{inv.status}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  {inv.status === 'Pending' ? (
                    <div className="flex gap-2 justify-end">
                       <Button
                          variant="outline"
                          size="sm"
                          disabled={loadingStates[inv.id]}
                          onClick={() => handleUpdateStatus(inv.userId, inv.id, 'Approved')}
                        >
                          {loadingStates[inv.id] ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                              <>
                                  <ThumbsUp className="h-4 w-4 mr-2" />
                                  Approve
                              </>
                          )}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={loadingStates[inv.id]}
                          onClick={() => handleUpdateStatus(inv.userId, inv.id, 'Rejected')}
                        >
                           {loadingStates[inv.id] ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                              <>
                                  <ThumbsDown className="h-4 w-4 mr-2" />
                                  Reject
                              </>
                          )}
                        </Button>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">Processed</span>
                  )}
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center">
                No investments found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </>
  );
}
