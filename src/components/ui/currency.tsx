import * as React from "react"

import { cn } from "@/lib/utils"

const Currency = React.forwardRef<
    HTMLSpanElement, // Changed from HTMLDivElement
    React.HTMLAttributes<HTMLSpanElement> & { value: number } // Changed from HTMLDivElement
>(({ className, value, ...props }, ref) => {

    const formatValue = (val: number) => {
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(val);
    }

    return (
        <span ref={ref} className={cn("inline-flex items-center gap-1", className)} {...props}>
            <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <path d="M7 18V6l10 12V6M5 10h14M5 14h14" />
            </svg>
            <span>{formatValue(value)}</span>
        </span>
    )
})
Currency.displayName = "Currency"

export { Currency }
