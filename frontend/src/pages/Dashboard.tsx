import { useEffect, useState } from "react";
import { BalanceCard } from "@/components/dashboard/BalanceCard";
import { SpendingOverview } from "@/components/dashboard/SpendingOverview";
import { RecentTransactions } from "@/components/dashboard/RecentTransactions";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { expenseService, Expense } from "@/api/expenseService";

export default function Dashboard() {
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchExpenses = async () => {
      try {
        const data = await expenseService.getExpenses();
        setExpenses(data);
      } catch (err) {
        console.error("Failed to load expenses", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchExpenses();
  }, []);

  // 🧠 Recent transactions (last 5)
  const recentTransactions = [...expenses]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  // 🧮 Group by category for pie chart
  const spendingOverviewData = Object.values(
    expenses.reduce((acc, expense) => {
      const category = expense.category;
      if (!acc[category]) {
        acc[category] = { name: category, value: 0 };
      }
      acc[category].value += expense.amount;
      return acc;
    }, {} as Record<string, { name: string; value: number }>)
  ).map((item) => ({
    ...item,
    color: getCategoryColor(item.name),
  }));

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
          <StatCard title="Monthly Spend" value={`$${getMonthlySpend(expenses).toFixed(2)}`} change={-2.5} />
          <StatCard title="Monthly Save" value="$820" change={12} />
          <StatCard title="Bills Due" value="$450" subtitle="Next 7 days" />
          <StatCard title="Budget Left" value="62%" subtitle="Until Apr 30" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentTransactions transactions={recentTransactions} />
        <SpendingOverview data={spendingOverviewData} />
      </div>
    </div>
  );
}

// Helper: Monthly spending total
function getMonthlySpend(expenses: Expense[]) {
  const now = new Date();
  return expenses.reduce((sum, expense) => {
    const date = new Date(expense.date);
    if (date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()) {
      return sum + expense.amount;
    }
    return sum;
  }, 0);
}

// Helper: Assign consistent colors by category
function getCategoryColor(category: string) {
  switch (category.toLowerCase()) {
    case 'food': return '#FF6384';
    case 'housing': return '#36A2EB';
    case 'transport': return '#FFCE56';
    case 'entertainment': return '#4BC0C0';
    case 'utilities': return '#9966FF';
    case 'coffee': return '#FFA07A';
    default: return '#8884d8';
  }
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
