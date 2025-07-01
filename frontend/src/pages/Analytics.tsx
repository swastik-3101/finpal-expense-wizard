import { useEffect, useState } from "react";
import { expenseService } from "@/api/expenseService";
import { SpendingChart } from "@/components/analytics/SpendingChart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const categoryColors: Record<string, string> = {
  Food: "#FF6384",
  Housing: "#36A2EB",
  Transport: "#FFCE56",
  Shopping: "#4BC0C0",
  Entertainment: "#9966FF",
  Utilities: "#FF9F40",
};

export default function Analytics() {
  const [monthlyData, setMonthlyData] = useState([]);
  const [weeklyData, setWeeklyData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);

  useEffect(() => {
    async function fetchData() {
      const expenses = await expenseService.getExpenses();

      const monthly = new Map<string, number>();
      const weekly = new Map<string, number>();
      const categories = new Map<string, number>();
      const budgets = {
        Food: 800,
        Housing: 1300,
        Transport: 400,
        Shopping: 300,
        Entertainment: 200,
        Utilities: 200,
      };

      const dayMap = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const monthMap = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

      for (const exp of expenses) {
        const dateObj = new Date(exp.date);
        const month = monthMap[dateObj.getMonth()];
        const day = dayMap[dateObj.getDay()];
        const category = exp.category || "Other";

        monthly.set(month, (monthly.get(month) || 0) + exp.amount);
        weekly.set(day, (weekly.get(day) || 0) + exp.amount);
        categories.set(category, (categories.get(category) || 0) + exp.amount);
      }

      setMonthlyData(Array.from(monthly, ([date, amount]) => ({ date, amount })));
      setWeeklyData(dayMap.map(day => ({ date: day, amount: weekly.get(day) || 0 })));
      setCategoryData(Array.from(categories, ([name, spending]) => ({
        name,
        spending,
        budget: budgets[name] || 500,
        color: categoryColors[name] || "#8884d8"
      })));
    }

    fetchData();
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight mb-2">Analytics</h1>
      <p className="text-muted-foreground mb-6">Visualize and analyze your spending habits</p>
      
      <Tabs defaultValue="overview" className="w-full mb-6">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SpendingChart data={monthlyData} title="Monthly Spending" />
            <SpendingChart data={weeklyData} title="Weekly Spending" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            <StatCard title="Total Spending" value={`₹${monthlyData.reduce((sum, d) => sum + d.amount, 0).toFixed(0)}`} subtitle="This Month" />
            <StatCard title="Avg. Daily Spend" value={`₹${(weeklyData.reduce((s, d) => s + d.amount, 0) / 7).toFixed(0)}`} change={-3.2} />
            <StatCard title="Budget Status" value="On Track" subtitle="₹450 remaining" />
          </div>
        </TabsContent>
        
        <TabsContent value="categories">
          <Card className="card-gradient">
            <CardHeader>
              <CardTitle>Spending by Category</CardTitle>
              <CardDescription>Budget vs actual spending by category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={categoryData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    barGap={0}
                    barCategoryGap={30}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(value) => `₹${value}`} />
                    <Tooltip formatter={(value: number) => [`$${value}`, 'Amount']} />
                    <Bar name="Budget" dataKey="budget" fill="#E2E8F0" radius={[4, 4, 0, 0]} />
                    <Bar name="Spending" dataKey="spending" radius={[4, 4, 0, 0]}>
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          
        </TabsContent>
        
        <TabsContent value="insights">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InsightCard 
              title="Spending Insight"
              description="You spent $120 more on entertainment this month compared to last month."
              action="Review Entertainment Budget"
            />
            <InsightCard 
              title="Saving Opportunity"
              description="Reduce your dining out expenses by $50 to meet your monthly saving goal."
              action="See Saving Tips"
            />
            <InsightCard 
              title="Budget Alert"
              description="You're approaching your shopping budget limit. $30 remaining for this month."
              action="Adjust Budget"
            />
            <InsightCard 
              title="Financial Trend"
              description="Your overall spending has decreased by 5% compared to the previous 3-month average."
              action="View Detailed Trends"
            />
          </div>
        </TabsContent>
      </Tabs>
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

function CategoryCard({ name, spent, budget, color, trend }: { name: string, spent: number, budget: number, color: string, trend: number }) {
  const percentage = Math.min(Math.round((spent / budget) * 100), 100);
  const remaining = budget - spent;
  const isOverBudget = remaining < 0;

  return (
    <Card className="card-gradient">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg">{name}</CardTitle>
          <div 
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: color }}
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span>${spent.toFixed(0)} spent</span>
            <span>Budget: ${budget.toFixed(0)}</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2.5">
            <div 
              className={`h-2.5 rounded-full ${isOverBudget ? 'bg-red-500' : 'bg-primary'}`}
              style={{ width: `${percentage}%`, backgroundColor: color }}
            ></div>
          </div>
          <div className="flex justify-between text-sm">
            <span className={isOverBudget ? 'text-red-500 font-medium' : 'text-muted-foreground'}>
              {isOverBudget ? `$${Math.abs(remaining).toFixed(0)} over` : `$${remaining.toFixed(0)} left`}
            </span>
            <span className={`font-medium ${trend >= 0 ? 'text-red-500' : 'text-green-500'}`}>
              {trend >= 0 ? '+' : ''}{trend}% vs last month
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function InsightCard({ title, description, action }: { title: string, description: string, action: string }) {
  return (
    <Card className="card-gradient">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-4">{description}</p>
        <button className="text-primary font-medium hover:underline">{action}</button>
      </CardContent>
    </Card>
  );
}
