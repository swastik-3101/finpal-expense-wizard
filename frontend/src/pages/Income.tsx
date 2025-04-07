import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PlusCircle, TrendingUp, WalletCards, AlertCircle } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";

// Mock data for income sources
const incomeSources = [
  {
    id: '1',
    name: 'Salary',
    targetMonthlyIncome: 5000,
    currentMonthlyIncome: 5200,
    color: 'bg-finpal-500',
  },
  {
    id: '2',
    name: 'Freelance',
    targetMonthlyIncome: 2000,
    currentMonthlyIncome: 1800,
    color: 'bg-secondary',
  },
  {
    id: '3',
    name: 'Investments',
    targetMonthlyIncome: 500,
    currentMonthlyIncome: 450,
    color: 'bg-emerald-500',
  }
];

export default function Income() {
  return (
    <AppLayout>
      <div>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Income Sources</h1>
            <p className="text-muted-foreground">Track and manage your income streams</p>
          </div>
          <Button className="bg-finpal-600 hover:bg-finpal-700">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Income Source
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <IncomeSummaryCard 
            title="Total Income Sources" 
            value={incomeSources.length.toString()} 
            icon={<WalletCards className="h-4 w-4" />} 
          />
          <IncomeSummaryCard 
            title="Total Monthly Income" 
            value={`$${incomeSources.reduce((sum, source) => sum + source.currentMonthlyIncome, 0).toLocaleString()}`} 
            icon={<TrendingUp className="h-4 w-4" />} 
          />
          <IncomeSummaryCard 
            title="Income Achievement" 
            value={`${Math.round(incomeSources.reduce((sum, source) => sum + (source.currentMonthlyIncome / source.targetMonthlyIncome * 100), 0) / incomeSources.length)}%`}
            icon={<AlertCircle className="h-4 w-4" />}
          />
        </div>
        
        <div className="grid grid-cols-1 gap-6">
          {incomeSources.map(source => (
            <IncomeSourceCard key={source.id} source={source} />
          ))}
        </div>
      </div>
    </AppLayout>
  );
}

function IncomeSummaryCard({ title, value, icon }: { title: string, value: string, icon: React.ReactNode }) {
  return (
    <Card className="card-gradient">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
          </div>
          <div className={`p-2 rounded-full bg-primary/10 text-primary`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function IncomeSourceCard({ source }: { source: typeof incomeSources[number] }) {
  const progress = Math.round(source.currentMonthlyIncome / source.targetMonthlyIncome * 100);
  const remainingAmount = source.targetMonthlyIncome - source.currentMonthlyIncome;
  
  return (
    <Card className="card-gradient overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle>{source.name}</CardTitle>
        <CardDescription>Target: ${source.targetMonthlyIncome.toLocaleString()} per month</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">${source.currentMonthlyIncome.toLocaleString()} earned</span>
          <span className="text-sm font-medium">{progress}%</span>
        </div>
        <Progress value={progress} className="h-2 mb-4" />
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>${remainingAmount.toLocaleString()} left to reach target</span>
        </div>
        <div className="mt-4 flex gap-2">
          <Button variant="outline" size="sm" className="flex-1">View Details</Button>
          <Button size="sm" className="bg-finpal-500 hover:bg-finpal-600 flex-1">Update Income</Button>
        </div>
      </CardContent>
    </Card>
  );
}