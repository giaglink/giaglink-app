"use client";

import { useState, useEffect } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { collection, query, getDocs } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { isInvestmentWindowOpen, getInvestmentWindowDetails } from "@/lib/holidays";

import { AddInvestmentDialog } from "@/components/dashboard/add-investment-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AlertTriangle, PlusCircle } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface AddInvestmentButtonProps {
  buttonText?: string;
  buttonClassName?: string;
}

export function AddInvestmentButton({ buttonText = "Add Investment", buttonClassName }: AddInvestmentButtonProps) {
  const [user] = useAuthState(auth);
  const [investmentCount, setInvestmentCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showInvestmentWindowPopover, setShowInvestmentWindowPopover] = useState(false);

  useEffect(() => {
    async function fetchInvestmentCount() {
      if (user) {
        try {
          const q = query(collection(db, "users", user.uid, "investments"));
          const querySnapshot = await getDocs(q);
          setInvestmentCount(querySnapshot.size);
        } catch (error) {
          console.error("Error fetching investment count:", error);
        } finally {
          setLoading(false);
        }
      } else if (user === null) {
        setLoading(false);
      }
    }
    fetchInvestmentCount();
  }, [user]);

  const isFirstInvestment = investmentCount === 0;
  const today = new Date();
  
  const investmentWindowOpen = isInvestmentWindowOpen(today);
  
  // Special check for admin users or specific users
  const isPrivilegedUser = user?.email === 'godisablegloballink@gmail.com' || user?.email === 'paulchilaka03@gmail.com';

  const shouldDisableFunctionality = !isFirstInvestment && !investmentWindowOpen && !isPrivilegedUser;
  
  const investmentWindowDetails = getInvestmentWindowDetails(today.getFullYear(), today.getMonth());

  const handleAddInvestmentClick = () => {
    if (shouldDisableFunctionality) {
      setShowInvestmentWindowPopover(true);
    } else {
      // The AddInvestmentDialog component handles its own open state
      // This click will be handled by its DialogTrigger
    }
  };

  if (loading) {
    return <Skeleton className="h-10 w-full" />;
  }

  if (shouldDisableFunctionality) {
    return (
      <Popover open={showInvestmentWindowPopover} onOpenChange={setShowInvestmentWindowPopover}>
        <PopoverTrigger asChild>
          <Button onClick={handleAddInvestmentClick} size="sm" className={cn("w-full bg-primary-light text-primary-light-foreground hover:bg-primary-light/90", buttonClassName)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            {buttonText}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <div className="grid gap-4">
            <div className="space-y-2">
              <h4 className="font-medium leading-none flex items-center">
                  <AlertTriangle className="mr-2 h-4 w-4 text-destructive" />
                  Investment Window Closed
              </h4>
              <p className="text-sm text-muted-foreground">
                New investments can only be added from the {investmentWindowDetails.startDay}st to the {investmentWindowDetails.endDay}nd of every month. If these dates fall on a public holiday, the window extends to the next business day.
              </p>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  // If the button is not disabled, render the normal dialog trigger
  // We need to pass the button size and text down to the dialog trigger
  return (
    <AddInvestmentDialog
      trigger={
        <Button size="sm" className={cn("w-full bg-primary-light text-primary-light-foreground hover:bg-primary-light/90 animate-pulse-glow", buttonClassName)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          {buttonText}
        </Button>
      }
    />
  );
}
