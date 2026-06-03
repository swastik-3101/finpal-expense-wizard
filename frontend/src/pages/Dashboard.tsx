import { useEffect, useState } from "react";
import { BalanceCard } from "@/components/dashboard/BalanceCard";
import { SpendingOverview } from "@/components/dashboard/SpendingOverview";
import { RecentTransactions } from "@/components/dashboard/RecentTransactions";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { expenseService, Expense } from "@/api/expenseService";
import { incomeService, IncomeTotals } from "@/api/incomeService";

export default function Dashboard() {
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [totals, setTotals] = useState<IncomeTotals | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [expenseData, totalsData] = await Promise.all([
          expenseService.getExpenses(),
          incomeService.getTotals(),
        ]);
        setExpenses(expenseData);
        setTotals(totalsData);
      } catch (err) {
        console.error("Failed to load dashboard data", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const recentTransactions = [...expenses]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

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

  const monthlySpend = getMonthlySpend(expenses);
  const budgetUsedPercent =
    totals?.monthlyBudget && totals.monthlyBudget > 0
      ? Math.min(Math.round((monthlySpend / totals.monthlyBudget) * 100), 100)
      : null;

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
        <BalanceCard
          currentBalance={totals?.totalBalance ?? 0}
          change={0}
        />
        <div className="grid grid-cols-2 gap-4">
          <StatCard
            title="Monthly Spend"
            value={isLoading ? "..." : `₹${monthlySpend.toFixed(2)}`}
            change={-2.5}
          />
          <StatCard
            title="Total Income"
            value={isLoading ? "..." : `₹${(totals?.totalIncome ?? 0).toLocaleString()}`}
          />
          <StatCard
            title="Monthly Budget"
            value={isLoading ? "..." : totals?.monthlyBudget ? `₹${totals.monthlyBudget.toLocaleString()}` : "Not set"}
            subtitle="Monthly limit"
          />
          <StatCard
            title="Budget Used"
            value={isLoading ? "..." : budgetUsedPercent !== null ? `${budgetUsedPercent}%` : "N/A"}
            subtitle={
              totals?.monthlyBudget && budgetUsedPercent !== null
                ? budgetUsedPercent >= 100
                  ? "⚠️ Exceeded!"
                  : "Until month end"
                : "Set a budget"
            }
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentTransactions transactions={recentTransactions} />
        <SpendingOverview data={spendingOverviewData} />
      </div>
    </div>
  );
}

function getMonthlySpend(expenses: Expense[]) {
  const now = new Date();
  return expenses.reduce((sum, expense) => {
    const date = new Date(expense.date);
    if (
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear()
    ) {
      return sum + expense.amount;
    }
    return sum;
  }, 0);
}

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

function StatCard({
  title,
  value,
  change,
  subtitle
}: {
  title: string;
  value: string;
  change?: number;
  subtitle?: string;
}) {
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