
import { SpendingChart } from "@/components/analytics/SpendingChart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const mockMonthlyData = [
  { date: "Jan", amount: 1800 },
  { date: "Feb", amount: 2200 },
  { date: "Mar", amount: 1950 },
  { date: "Apr", amount: 2450 },
  { date: "May", amount: 2100 },
  { date: "Jun", amount: 2300 },
];

const mockWeeklyData = [
  { date: "Mon", amount: 120 },
  { date: "Tue", amount: 145 },
  { date: "Wed", amount: 85 },
  { date: "Thu", amount: 190 },
  { date: "Fri", amount: 250 },
  { date: "Sat", amount: 320 },
  { date: "Sun", amount: 175 },
];

const mockCategoryData = [
  { name: "Food", spending: 750, budget: 800, color: "#FF6384" },
  { name: "Housing", spending: 1200, budget: 1300, color: "#36A2EB" },
  { name: "Transport", spending: 450, budget: 400, color: "#FFCE56" },
  { name: "Shopping", spending: 320, budget: 300, color: "#4BC0C0" },
  { name: "Entertainment", spending: 280, budget: 200, color: "#9966FF" },
  { name: "Utilities", spending: 190, budget: 200, color: "#FF9F40" },
];

export default function Analytics() {
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
            <SpendingChart data={mockMonthlyData} title="Monthly Spending" />
            <SpendingChart data={mockWeeklyData} title="Weekly Spending" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            <StatCard title="Total Spending" value="$3,245" subtitle="This Month" />
            <StatCard title="Avg. Daily Spend" value="$105" change={-3.2} />
            <StatCard title="Budget Status" value="On Track" subtitle="$450 remaining" />
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
                    data={mockCategoryData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    barGap={0}
                    barCategoryGap={30}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(value) => `$${value}`} />
                    <Tooltip
                      formatter={(value: number) => [`$${value}`, 'Amount']}
                    />
                    <Bar name="Budget" dataKey="budget" fill="#E2E8F0" radius={[4, 4, 0, 0]} />
                    <Bar name="Spending" dataKey="spending" radius={[4, 4, 0, 0]}>
                      {mockCategoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            <CategoryCard 
              name="Food & Dining" 
              spent={750} 
              budget={800} 
              color="#FF6384" 
              trend={-5} 
            />
            <CategoryCard 
              name="Transportation" 
              spent={450} 
              budget={400} 
              color="#FFCE56" 
              trend={12} 
            />
            <CategoryCard 
              name="Entertainment" 
              spent={280} 
              budget={200} 
              color="#9966FF" 
              trend={40} 
            />
          </div>
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
