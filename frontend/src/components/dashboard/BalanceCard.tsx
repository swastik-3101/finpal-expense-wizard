
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDown, ArrowUp } from "lucide-react";

interface BalanceCardProps {
  currentBalance: number;
  change: number;
}

export function BalanceCard({ currentBalance, change }: BalanceCardProps) {
  const formattedBalance = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(currentBalance);
  
  const isPositive = change >= 0;
  
  return (
    <Card className="card-gradient">
      <CardHeader className="pb-2">
        <CardDescription>Current Balance</CardDescription>
        <CardTitle className="text-3xl font-bold">
          {formattedBalance}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center">
          <div className={`p-1 rounded-full mr-2 ${isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {isPositive ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
          </div>
          <div className={`text-sm font-medium ${isPositive ? 'text-green-700' : 'text-red-700'}`}>
            {isPositive ? '+' : ''}{change}% from last month
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
