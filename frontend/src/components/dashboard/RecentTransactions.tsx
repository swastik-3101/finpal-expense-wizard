
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingBag, Coffee, Home, Car, Utensils, Cpu } from "lucide-react";

interface Transaction {
  id: string;
  title: string;
  amount: number;
  date: string;
  category: string;
}

interface RecentTransactionsProps {
  transactions: Transaction[];
}

const getCategoryIcon = (category: string) => {
  switch (category.toLowerCase()) {
    case 'shopping':
      return <ShoppingBag className="h-4 w-4 text-finpal-500" />;
    case 'food':
      return <Utensils className="h-4 w-4 text-orange-500" />;
    case 'coffee':
      return <Coffee className="h-4 w-4 text-amber-600" />;
    case 'housing':
      return <Home className="h-4 w-4 text-blue-500" />;
    case 'transport':
      return <Car className="h-4 w-4 text-emerald-500" />;
    default:
      return <Cpu className="h-4 w-4 text-purple-500" />;
  }
};

export function RecentTransactions({ transactions }: RecentTransactionsProps) {
  return (
    <Card className="card-gradient">
      <CardHeader>
        <CardTitle>Recent Transactions</CardTitle>
        <CardDescription>Your latest spending activity</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {transactions.map((transaction) => (
            <div
              key={transaction.id}
              className="flex items-center justify-between rounded-lg border p-3 shadow-sm"
            >
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-full bg-muted">
                  {getCategoryIcon(transaction.category)}
                </div>
                <div>
                  <p className="text-sm font-medium">{transaction.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {transaction.date} · {transaction.category}
                  </p>
                </div>
              </div>
              <p className="text-sm font-medium">-${transaction.amount.toFixed(2)}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
