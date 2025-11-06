"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Currency } from "@/components/ui/currency";
import type { WithdrawalWithUser } from "@/app/admin/withdrawals/page";
import { Button } from "@/components/ui/button";
import { ThumbsUp, ThumbsDown, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { updateWithdrawalStatusAndNotify } from "@/app/admin/withdrawals/actions";

interface AdminWithdrawalsClientProps {
    initialWithdrawals: WithdrawalWithUser[];
}

export function AdminWithdrawalsClient({ initialWithdrawals }: AdminWithdrawalsClientProps) {
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const { toast } = useToast();
  const router = useRouter();

  const handleUpdateStatus = async (userId: string, withdrawalId: string, newStatus: 'Completed' | 'Rejected') => {
    setLoadingStates(prev => ({ ...prev, [withdrawalId]: true }));
    try {
      const result = await updateWithdrawalStatusAndNotify({ userId, withdrawalId, newStatus });
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
        setLoadingStates(prev => ({ ...prev, [withdrawalId]: false }));
    }
  };


  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  const getStatusBadgeVariant = (status: WithdrawalWithUser['status']) => {
    switch (status) {
      case 'Completed': return 'default';
      case 'Pending': return 'secondary';
      case 'Rejected': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>User</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {initialWithdrawals.length > 0 ? (
          initialWithdrawals.map((w) => (
            <TableRow key={w.id}>
              <TableCell>
                <div className="font-medium">{w.user?.fullName}</div>
                <div className="text-sm text-muted-foreground">{w.user?.email}</div>
              </TableCell>
              <TableCell>{formatDate(w.createdAt)}</TableCell>
              <TableCell className="font-mono">
                <Currency value={w.payoutAmount} />
              </TableCell>
              <TableCell>
                <Badge variant={getStatusBadgeVariant(w.status)}>{w.status}</Badge>
              </TableCell>
              <TableCell className="text-right">
                {w.status === 'Pending' ? (
                  <div className="flex gap-2 justify-end">
                     <Button
                        variant="outline"
                        size="sm"
                        disabled={loadingStates[w.id]}
                        onClick={() => handleUpdateStatus(w.userId, w.id, 'Completed')}
                      >
                        {loadingStates[w.id] ? (
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
                        disabled={loadingStates[w.id]}
                        onClick={() => handleUpdateStatus(w.userId, w.id, 'Rejected')}
                      >
                         {loadingStates[w.id] ? (
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
            <TableCell colSpan={5} className="h-24 text-center">
              No withdrawal requests found.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
