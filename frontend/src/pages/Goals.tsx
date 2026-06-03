import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { PlusCircle, Target, TrendingUp, Trash2, X } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { goalService, Goal } from "@/api/goalService";
import { toast } from "@/hooks/use-toast";

export default function Goals() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [contributeGoalId, setContributeGoalId] = useState<string | null>(null);
  const [contributeAmount, setContributeAmount] = useState("");
  const [isContributing, setIsContributing] = useState(false);

  // New goal form state
  const [form, setForm] = useState({
    title: "", description: "", targetAmount: "",
    currentAmount: "", targetDate: "", category: ""
  });
  const [isCreating, setIsCreating] = useState(false);

  const fetchGoals = async () => {
    try {
      const data = await goalService.getGoals();
      setGoals(data);
    } catch (err) {
      console.error("Failed to load goals", err);
      toast({ title: "Error", description: "Failed to load goals", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchGoals(); }, []);

  const handleCreate = async () => {
    if (!form.title || !form.targetAmount) {
      return toast({ title: "Title and target amount are required", variant: "destructive" });
    }
    setIsCreating(true);
    try {
      await goalService.createGoal({
        title: form.title,
        description: form.description,
        targetAmount: parseFloat(form.targetAmount),
        currentAmount: parseFloat(form.currentAmount) || 0,
        targetDate: form.targetDate || undefined,
        category: form.category || undefined,
      });
      toast({ title: "Goal created!" });
      setForm({ title: "", description: "", targetAmount: "", currentAmount: "", targetDate: "", category: "" });
      setShowForm(false);
      fetchGoals();
    } catch (err) {
      toast({ title: "Failed to create goal", variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  const handleContribute = async (goalId: string) => {
    const amount = parseFloat(contributeAmount);
    if (!amount || amount <= 0) return toast({ title: "Enter a valid amount", variant: "destructive" });
    setIsContributing(true);
    try {
      const updated = await goalService.contribute(goalId, amount);
      setGoals(prev => prev.map(g => g._id === goalId ? updated : g));
      setContributeGoalId(null);
      setContributeAmount("");
      toast({ title: "Contribution added!" });
    } catch (err: any) {
      toast({ title: err?.response?.data?.msg || "Failed to contribute", variant: "destructive" });
    } finally {
      setIsContributing(false);
    }
  };

  const handleDelete = async (goalId: string) => {
    try {
      await goalService.deleteGoal(goalId);
      setGoals(prev => prev.filter(g => g._id !== goalId));
      toast({ title: "Goal deleted" });
    } catch (err) {
      toast({ title: "Failed to delete goal", variant: "destructive" });
    }
  };

  const totalSaved = goals.reduce((sum, g) => sum + g.currentAmount, 0);
  const avgCompletion = goals.length
    ? Math.round(goals.reduce((sum, g) => sum + g.progressPercent, 0) / goals.length)
    : 0;

  return (
    <AppLayout>
      <div>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Financial Goals</h1>
            <p className="text-muted-foreground">Track and manage your savings goals</p>
          </div>
          <Button className="bg-finpal-600 hover:bg-finpal-700" onClick={() => setShowForm(!showForm)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            {showForm ? "Cancel" : "Add New Goal"}
          </Button>
        </div>

        {/* Create Goal Form */}
        {showForm && (
          <Card className="card-gradient mb-6">
            <CardHeader>
              <CardTitle>New Goal</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input placeholder="Title *" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
              <Input placeholder="Category" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} />
              <Input placeholder="Description" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
              <Input type="number" placeholder="Target Amount *" value={form.targetAmount} onChange={e => setForm(p => ({ ...p, targetAmount: e.target.value }))} />
              <Input type="number" placeholder="Current Amount (optional)" value={form.currentAmount} onChange={e => setForm(p => ({ ...p, currentAmount: e.target.value }))} />
              <Input type="date" placeholder="Target Date" value={form.targetDate} onChange={e => setForm(p => ({ ...p, targetDate: e.target.value }))} />
              <div className="md:col-span-2 flex justify-end">
                <Button className="bg-finpal-600 hover:bg-finpal-700" onClick={handleCreate} disabled={isCreating}>
                  {isCreating ? "Creating..." : "Create Goal"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <GoalSummaryCard title="Total Goals" value={isLoading ? "..." : goals.length.toString()} icon={<Target className="h-4 w-4" />} />
          <GoalSummaryCard title="Total Saved" value={isLoading ? "..." : `₹${totalSaved.toLocaleString()}`} icon={<TrendingUp className="h-4 w-4" />} />
          <GoalSummaryCard title="Avg Completion" value={isLoading ? "..." : `${avgCompletion}%`} icon={<Target className="h-4 w-4" />} />
        </div>

        {/* Goal Cards */}
        {isLoading ? (
          <p className="text-muted-foreground">Loading goals...</p>
        ) : goals.length === 0 ? (
          <p className="text-muted-foreground">No goals yet. Create your first one!</p>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {goals.map(goal => (
              <Card key={goal._id} className="card-gradient overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{goal.title}</CardTitle>
                      <CardDescription>
                        Target: ₹{goal.targetAmount.toLocaleString()}
                        {goal.targetDate && ` by ${new Date(goal.targetDate).toLocaleDateString()}`}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${goal.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                        {goal.status}
                      </span>
                      <button onClick={() => handleDelete(goal._id!)} className="text-muted-foreground hover:text-red-500 transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">₹{goal.currentAmount.toLocaleString()} saved</span>
                    <span className="text-sm font-medium">{Math.round(goal.progressPercent)}%</span>
                  </div>
                  <Progress value={goal.progressPercent} className="h-2 mb-4" />
                  <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                    <span>₹{(goal.targetAmount - goal.currentAmount).toLocaleString()} remaining</span>
                    {goal.category && <span className="text-xs bg-muted px-2 py-0.5 rounded">{goal.category}</span>}
                  </div>

                  {contributeGoalId === goal._id ? (
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Contribution amount"
                        value={contributeAmount}
                        onChange={e => setContributeAmount(e.target.value)}
                      />
                      <Button size="sm" className="bg-finpal-500 hover:bg-finpal-600"
                        onClick={() => handleContribute(goal._id!)} disabled={isContributing}>
                        {isContributing ? "..." : "Confirm"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { setContributeGoalId(null); setContributeAmount(""); }}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1"
                        onClick={() => goalService.updateStatus(goal._id!, goal.status === 'completed' ? 'in-progress' : 'completed')
                          .then(fetchGoals)}>
                        {goal.status === 'completed' ? 'Reopen' : 'Mark Complete'}
                      </Button>
                      <Button size="sm" className="bg-finpal-500 hover:bg-finpal-600 flex-1"
                        onClick={() => { setContributeGoalId(goal._id!); setContributeAmount(""); }}
                        disabled={goal.status === 'completed'}>
                        Add Funds
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function GoalSummaryCard({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) {
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