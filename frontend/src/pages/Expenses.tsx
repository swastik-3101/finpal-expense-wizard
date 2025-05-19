import { useState, useEffect } from "react";
import { AddExpenseForm } from "@/components/expenses/AddExpenseForm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,  
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { ShoppingBag, Coffee, Home, Car, Search, Utensils, Cpu, Loader2 } from "lucide-react";
import { expenseService, Expense } from "@/api/expenseService";
import { useToast } from "@/hooks/use-toast";

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

export default function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadExpenses();
  }, []);

  const loadExpenses = async () => {
    setIsLoading(true);
    try {
      const data = await expenseService.getExpenses();
      setExpenses(data);
      setIsLoading(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load expenses",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const handleAddExpense = async (newExpense: {
    title: string;
    amount: number;
    category: string;
    date: string;
  }) => {
    try {
      const savedExpense = await expenseService.addExpense(newExpense);
      setExpenses([savedExpense, ...expenses]);
      
      toast({
        title: "Success",
        description: "Expense added successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add expense",
        variant: "destructive",
      });
    }
  };
  
  const filteredExpenses = expenses.filter((expense) =>
    expense.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    expense.category.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight mb-2">Expenses</h1>
      <p className="text-muted-foreground mb-6">Manage and track your spending</p>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <AddExpenseForm onAddExpense={handleAddExpense} />
        </div>
        
        <div className="lg:col-span-2">
          <Tabs defaultValue="all" className="card-gradient rounded-lg p-4">
            <div className="flex justify-between items-center mb-4">
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="recent">Recent</TabsTrigger>
                <TabsTrigger value="highest">Highest</TabsTrigger>
              </TabsList>
              
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search expenses..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            <TabsContent value="all" className="p-0">
              {isLoading ? <LoadingState /> : <ExpenseList expenses={filteredExpenses} />}
            </TabsContent>
            
            <TabsContent value="recent" className="p-0">
              {isLoading ? <LoadingState /> : (
                <ExpenseList 
                  expenses={filteredExpenses.slice().sort((a, b) => 
                    new Date(b.date).getTime() - new Date(a.date).getTime()
                  )} 
                />
              )}
            </TabsContent>
            
            <TabsContent value="highest" className="p-0">
              {isLoading ? <LoadingState /> : (
                <ExpenseList 
                  expenses={filteredExpenses.slice().sort((a, b) => 
                    b.amount - a.amount
                  )} 
                />
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex justify-center items-center py-12">
      <Loader2 className="h-8 w-8 animate-spin text-finpal-500" />
    </div>
  );
}

function ExpenseList({ expenses }: { expenses: Expense[] }) {
  if (expenses.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No expenses found
      </div>
    );
  }
  
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {expenses.map((expense) => (
            <TableRow key={expense.id}>
              <TableCell>{expense.title}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded-full bg-muted">
                    {getCategoryIcon(expense.category)}
                  </span>
                  {expense.category}
                </div>
              </TableCell>
              <TableCell>{expense.date}</TableCell>
              <TableCell className="text-right font-medium">
                ${expense.amount.toFixed(2)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
