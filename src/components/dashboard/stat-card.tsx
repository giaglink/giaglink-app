import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import type { ReactNode } from "react";

interface StatCardProps {
  title: string;
  value: ReactNode;
  icon: ReactNode;
  change?: string;
  changeColor?: string;
  footer?: ReactNode;
}

export function StatCard({ title, value, icon, change, changeColor, footer }: StatCardProps) {
  return (
    <Card className="flex flex-col justify-between">
      <div>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          {icon}
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{value}</div>
          {change && (
            <p className={`text-xs ${changeColor || 'text-muted-foreground'}`}>
              {change}
            </p>
          )}
        </CardContent>
      </div>
      {footer && (
        <CardFooter className="pt-4">
            {footer}
        </CardFooter>
      )}
    </Card>
  );
}
