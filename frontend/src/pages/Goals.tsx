import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PlusCircle, Target, TrendingUp, AlertCircle } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";

// Mock data for goals
const goals = [
  {
    id: '1',
    name: 'Emergency Fund',
    targetAmount: 10000,
    currentAmount: 6500,
    deadline: '2025-08-01',
    color: 'bg-finpal-500',
  },
  {
    id: '2',
    name: 'New Car',
    targetAmount: 25000,
    currentAmount: 5000,
    deadline: '2026-02-01',
    color: 'bg-secondary',
  },
  {
    id: '3',
    name: 'Vacation',
    targetAmount: 5000,
    currentAmount: 3200,
    deadline: '2025-06-01',
    color: 'bg-emerald-500',
  }
];

export default function Goals() {
  return (
    <AppLayout>
      <div>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Financial Goals</h1>
            <p className="text-muted-foreground">Track and manage your savings goals</p>
          </div>
          <Button className="bg-finpal-600 hover:bg-finpal-700">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add New Goal
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <GoalSummaryCard 
            title="Total Goals" 
            value={goals.length.toString()} 
            icon={<Target className="h-4 w-4" />} 
          />
          <GoalSummaryCard 
            title="Total Savings" 
            value={`$${goals.reduce((sum, goal) => sum + goal.currentAmount, 0).toLocaleString()}`} 
            icon={<TrendingUp className="h-4 w-4" />} 
          />
          <GoalSummaryCard 
            title="Completion Average" 
            value={`${Math.round(goals.reduce((sum, goal) => sum + (goal.currentAmount / goal.targetAmount * 100), 0) / goals.length)}%`}
            icon={<AlertCircle className="h-4 w-4" />}
          />
        </div>
        
        <div className="grid grid-cols-1 gap-6">
          {goals.map(goal => (
            <GoalCard key={goal.id} goal={goal} />
          ))}
        </div>
      </div>
    </AppLayout>
  );
}

function GoalSummaryCard({ title, value, icon }: { title: string, value: string, icon: React.ReactNode }) {
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

function GoalCard({ goal }: { goal: typeof goals[number] }) {
  const progress = Math.round(goal.currentAmount / goal.targetAmount * 100);
  const remainingAmount = goal.targetAmount - goal.currentAmount;
  const today = new Date();
  const deadline = new Date(goal.deadline);
  const daysLeft = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  return (
    <Card className="card-gradient overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle>{goal.name}</CardTitle>
        <CardDescription>Target: ${goal.targetAmount.toLocaleString()} by {new Date(goal.deadline).toLocaleDateString()}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">${goal.currentAmount.toLocaleString()} saved</span>
          <span className="text-sm font-medium">{progress}%</span>
        </div>
        <Progress value={progress} className="h-2 mb-4" />
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>${remainingAmount.toLocaleString()} left to save</span>
          <span>{daysLeft} days remaining</span>
        </div>
        <div className="mt-4 flex gap-2">
          <Button variant="outline" size="sm" className="flex-1">View Details</Button>
          <Button size="sm" className="bg-finpal-500 hover:bg-finpal-600 flex-1">Add Funds</Button>
        </div>
      </CardContent>
    </Card>
  );
}
