"use client";

import { Suspense } from "react";
import { PortfolioTable } from "@/components/dashboard/portfolio-table";
import { AddInvestmentButton } from "@/components/dashboard/add-investment-button";

function PortfolioContent() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-headline font-semibold">Your Investments</h2>
        <div className="w-[170px]">
          <AddInvestmentButton buttonClassName="bg-primary-light text-primary-light-foreground hover:bg-primary-light/90 animate-pulse-glow" />
        </div>
      </div>
      <PortfolioTable />
    </div>
  );
}


export default function PortfolioPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PortfolioContent />
    </Suspense>
  )
}
