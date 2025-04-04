
import { BalanceCard } from "@/components/dashboard/BalanceCard";
import { SpendingOverview } from "@/components/dashboard/SpendingOverview";
import { RecentTransactions } from "@/components/dashboard/RecentTransactions";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

const mockSpendingData = [
  { name: 'Food', value: 500, color: '#FF6384' },
  { name: 'Housing', value: 1200, color: '#36A2EB' },
  { name: 'Transport', value: 300, color: '#FFCE56' },
  { name: 'Entertainment', value: 200, color: '#4BC0C0' },
  { name: 'Utilities', value: 150, color: '#9966FF' },
];

const mockTransactions = [
  {
    id: '1',
    title: 'Grocery Shopping',
    amount: 85.75,
    date: '2025-04-01',
    category: 'Food',
  },
  {
    id: '2',
    title: 'Coffee Shop',
    amount: 4.50,
    date: '2025-04-01',
    category: 'Coffee',
  },
  {
    id: '3',
    title: 'Uber Ride',
    amount: 24.30,
    date: '2025-03-31',
    category: 'Transport',
  },
  {
    id: '4',
    title: 'Streaming Service',
    amount: 14.99,
    date: '2025-03-30',
    category: 'Entertainment',
  },
];

export default function Dashboard() {
  const navigate = useNavigate();
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back to your financial overview</p>
        </div>
        <Button 
          onClick={() => navigate('/expenses')}
          className="bg-finpal-600 hover:bg-finpal-700"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Expense
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <BalanceCard currentBalance={2450.75} change={5.2} />
        <div className="grid grid-cols-2 gap-4">
          <StatCard title="Monthly Spend" value="$2,345" change={-2.5} />
          <StatCard title="Monthly Save" value="$820" change={12} />
          <StatCard title="Bills Due" value="$450" subtitle="Next 7 days" />
          <StatCard title="Budget Left" value="62%" subtitle="Until Apr 30" />
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentTransactions transactions={mockTransactions} />
        <SpendingOverview data={mockSpendingData} />
      </div>
    </div>
  );
}

function StatCard({ title, value, change, subtitle }: { title: string, value: string, change?: number, subtitle?: string }) {
  return (
    <div className="bg-card rounded-lg shadow-sm p-4 card-gradient">
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      {change !== undefined ? (
        <div className={`text-xs font-medium mt-1 ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {change >= 0 ? '+' : ''}{change}% from last month
        </div>
      ) : subtitle ? (
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
      ) : null}
    </div>
  );
}
