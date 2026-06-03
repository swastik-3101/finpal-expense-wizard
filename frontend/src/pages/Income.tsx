import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusCircle, TrendingUp, WalletCards, PiggyBank } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { incomeService, IncomeTotals } from "@/api/incomeService";
import { toast } from "@/hooks/use-toast";

export default function Income() {
  const [totals, setTotals] = useState<IncomeTotals | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [addAmount, setAddAmount] = useState("");
  const [budgetAmount, setBudgetAmount] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isSettingBudget, setIsSettingBudget] = useState(false);

  const fetchTotals = async () => {
    try {
      const data = await incomeService.getTotals();
      setTotals(data);
    } catch (err) {
      console.error("Failed to load income data", err);
      toast({ title: "Error", description: "Failed to load income data", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchTotals(); }, []);

  const handleAddIncome = async () => {
    const amount = parseFloat(addAmount);
    if (!amount || amount <= 0) return toast({ title: "Invalid amount", variant: "destructive" });
    setIsAdding(true);
    try {
      const updated = await incomeService.addIncome(amount);
      setTotals(prev => prev ? { ...prev, ...updated } : updated as IncomeTotals);
      setAddAmount("");
      toast({ title: "Income added successfully!" });
    } catch (err) {
      toast({ title: "Failed to add income", variant: "destructive" });
    } finally {
      setIsAdding(false);
    }
  };

  const handleSetBudget = async () => {
    const amount = parseFloat(budgetAmount);
    if (!amount || amount <= 0) return toast({ title: "Invalid budget amount", variant: "destructive" });
    setIsSettingBudget(true);
    try {
      const updated = await incomeService.setMonthlyBudget(amount);
      setTotals(prev => prev ? { ...prev, monthlyBudget: updated.monthlyBudget } : null);
      setBudgetAmount("");
      toast({ title: "Monthly budget updated!" });
    } catch (err) {
      toast({ title: "Failed to update budget", variant: "destructive" });
    } finally {
      setIsSettingBudget(false);
    }
  };

  const budgetUsedPercent = totals && totals.monthlyBudget > 0
    ? Math.min(Math.round((totals.totalExpenses / totals.monthlyBudget) * 100), 100)
    : 0;

  return (
    <AppLayout>
      <div>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Income & Balance</h1>
            <p className="text-muted-foreground">Track your income and manage your budget</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <IncomeSummaryCard
            title="Total Income"
            value={isLoading ? "..." : `₹${(totals?.totalIncome ?? 0).toLocaleString()}`}
            icon={<WalletCards className="h-4 w-4" />}
          />
          <IncomeSummaryCard
            title="Total Balance"
            value={isLoading ? "..." : `₹${(totals?.totalBalance ?? 0).toLocaleString()}`}
            icon={<TrendingUp className="h-4 w-4" />}
          />
          <IncomeSummaryCard
            title="Monthly Budget"
            value={isLoading ? "..." : totals?.monthlyBudget ? `₹${totals.monthlyBudget.toLocaleString()}` : "Not set"}
            icon={<PiggyBank className="h-4 w-4" />}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Add Income */}
          <Card className="card-gradient">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PlusCircle className="h-5 w-5" /> Add Income
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Current total income: <span className="font-semibold text-foreground">₹{(totals?.totalIncome ?? 0).toLocaleString()}</span>
              </p>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Enter amount"
                  value={addAmount}
                  onChange={e => setAddAmount(e.target.value)}
                />
                <Button
                  className="bg-finpal-600 hover:bg-finpal-700"
                  onClick={handleAddIncome}
                  disabled={isAdding}
                >
                  {isAdding ? "Adding..." : "Add"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Set Budget */}
          <Card className="card-gradient">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PiggyBank className="h-5 w-5" /> Monthly Budget
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {totals?.monthlyBudget ? (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Budget used</span>
                    <span className={budgetUsedPercent >= 100 ? "text-red-500 font-semibold" : "font-semibold"}>
                      {budgetUsedPercent}%
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${budgetUsedPercent >= 100 ? 'bg-red-500' : 'bg-finpal-500'}`}
                      style={{ width: `${budgetUsedPercent}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    ₹{(totals?.totalExpenses ?? 0).toLocaleString()} spent of ₹{totals.monthlyBudget.toLocaleString()} budget
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No budget set yet.</p>
              )}
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Set monthly budget"
                  value={budgetAmount}
                  onChange={e => setBudgetAmount(e.target.value)}
                />
                <Button
                  className="bg-finpal-600 hover:bg-finpal-700"
                  onClick={handleSetBudget}
                  disabled={isSettingBudget}
                >
                  {isSettingBudget ? "Saving..." : "Set"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}

function IncomeSummaryCard({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) {
  return (
    <Card className="card-gradient">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
          </div>
          <div className="p-2 rounded-full bg-primary/10 text-primary">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}