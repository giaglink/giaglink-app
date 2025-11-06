"use client"

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PlusCircle } from "lucide-react";
import { AddInvestmentForm } from "./add-investment-form";

interface AddInvestmentDialogProps {
  trigger?: React.ReactNode;
}

export function AddInvestmentDialog({ trigger }: AddInvestmentDialogProps) {
  const [open, setOpen] = useState(false);

  const dialogTrigger = trigger || (
    <Button>
      <PlusCircle className="mr-2 h-4 w-4" />
      Add Investment
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {dialogTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Investment</DialogTitle>
          <DialogDescription>
            Log your new investment here and proceed to payment.
          </DialogDescription>
        </DialogHeader>
        <AddInvestmentForm onClose={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
