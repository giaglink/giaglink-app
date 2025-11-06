"use client"

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Line, LineChart, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { ArrowUp, ArrowDown, AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getForexData } from '@/app/actions/forex';

interface ForexDataPoint {
  time: string;
  price: number;
}

const FOREX_PAIRS = [
  { name: "EUR/USD", from: "EUR", to: "USD" },
  { name: "GBP/USD", from: "GBP", to: "USD" },
  { name: "USD/JPY", from: "USD", to: "JPY" },
  { name: "USD/CHF", from: "USD", to: "CHF" },
  { name: "AUD/USD", from: "AUD", to: "USD" },
];

const chartConfig = {
  price: {
    label: "Price",
    color: "hsl(var(--chart-2))",
  },
};


export function PerformanceChart() {
  const [currentPairIndex, setCurrentPairIndex] = useState(0);
  const [data, setData] = useState<ForexDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const pairIndexRef = useRef(currentPairIndex);
  pairIndexRef.current = currentPairIndex;

  const currentPair = FOREX_PAIRS[currentPairIndex];

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const nextPairIndex = (pairIndexRef.current + 1) % FOREX_PAIRS.length;
    const pairToFetch = FOREX_PAIRS[pairIndexRef.current];

    const result = await getForexData(pairToFetch.from, pairToFetch.to);
    
    if (result.success && result.data && result.data.length > 0) {
        setData(result.data);
    } else {
        const errorMessage = result.message || 'Failed to load chart data.';
        setError(errorMessage);
        setData([]); // Clear data on error
    }
    setLoading(false);

    // Set the index for the *next* fetch
    setCurrentPairIndex(nextPairIndex);
  }, []);

  useEffect(() => {
    // Fetch immediately on mount
    fetchData(); 

    // Then fetch every 5 minutes
    const interval = setInterval(() => {
        fetchData();
    }, 300000); // 5 minutes

    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  const initialPrice = data[0]?.price || 0;
  const currentPrice = data[data.length - 1]?.price || 0;
  const absoluteChange = currentPrice - initialPrice;
  const percentageChange = initialPrice > 0 ? (absoluteChange / initialPrice) * 100 : 0;
  const isPositive = absoluteChange >= 0;


  const renderChartContent = () => {
    if (loading) {
        return (
            <div className="flex h-[250px] w-full flex-col items-center justify-center gap-2 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <h3 className="text-lg font-medium">Loading Live Data...</h3>
                <p className="text-sm text-muted-foreground">
                    Establishing connection to the market.
                </p>
            </div>
        )
    }

    if (error || data.length === 0) {
        return (
             <div className="flex h-[250px] w-full flex-col items-center justify-center gap-2 text-center">
                <AlertTriangle className="h-8 w-8 text-destructive" />
                <h3 className="text-lg font-medium">Could Not Load Chart</h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                    {error || 'An unknown error occurred while fetching market data.'}
                </p>
            </div>
        )
    }

    return (
        <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <LineChart
                data={data}
                margin={{
                    top: 5,
                    right: 20,
                    left: -10,
                    bottom: 0,
                }}
            >
                <CartesianGrid vertical={false} strokeDasharray="3 3" strokeOpacity={0.2}/>
                <XAxis
                    dataKey="time"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    interval="preserveStartEnd"
                    ticks={[data[0]?.time, data[Math.floor(data.length / 2)]?.time, data[data.length - 1]?.time].filter(Boolean)}
                />
                <YAxis
                    dataKey="price" 
                    tickLine={false}
                    axisLine={false}
                    domain={['dataMin', 'dataMax']}
                    tickFormatter={(value) => Number(value).toFixed(4)}
                    width={60}
                />
                <Tooltip
                    cursor={true}
                    content={<ChartTooltipContent 
                        indicator="line"
                        labelClassName="text-sm"
                        formatter={(value) => Number(value).toFixed(5)}
                    />}
                />
                <Line
                    dataKey="price"
                    type="monotone"
                    stroke={isPositive ? "hsl(var(--chart-2))" : "hsl(var(--destructive))"}
                    strokeWidth={2}
                    dot={false}
                />
            </LineChart>
        </ChartContainer>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="font-headline">Live Market: {currentPair.name}</CardTitle>
            <CardDescription>Displaying the last 2.5 hours of data. Updates periodically from Twelve Data.</CardDescription>
          </div>
          {!loading && data.length > 0 && (
             <div className="text-right">
                <div className="text-2xl font-bold font-mono">{currentPrice.toFixed(5)}</div>
                <div className={cn("flex items-center justify-end text-sm", isPositive ? "text-green-500" : "text-red-500")}>
                    {isPositive ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                    <span>{absoluteChange.toFixed(5)} ({percentageChange.toFixed(3)}%)</span>
                </div>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {renderChartContent()}
      </CardContent>
    </Card>
  )
}
