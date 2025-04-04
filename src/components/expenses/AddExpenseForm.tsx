
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, Receipt, Mic } from "lucide-react";

interface AddExpenseFormProps {
  onAddExpense: (expense: {
    title: string;
    amount: number;
    category: string;
    date: string;
  }) => void;
}

export function AddExpenseForm({ onAddExpense }: AddExpenseFormProps) {
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [isListening, setIsListening] = useState(false);
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title || !amount || !category) {
      toast({
        title: "Error",
        description: "Please fill out all fields",
        variant: "destructive",
      });
      return;
    }
    
    const amountValue = parseFloat(amount);
    
    if (isNaN(amountValue) || amountValue <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }
    
    onAddExpense({
      title,
      amount: amountValue,
      category,
      date: new Date().toISOString().split("T")[0],
    });
    
    setTitle("");
    setAmount("");
    setCategory("");
    
    toast({
      title: "Success",
      description: "Expense added successfully",
    });
  };

  const handleVoiceInput = () => {
    setIsListening(true);
    
    toast({
      title: "Voice Input",
      description: "Feature coming soon!",
    });
    
    // After 2 seconds, set listening back to false
    setTimeout(() => {
      setIsListening(false);
    }, 2000);
  };

  const handleReceiptUpload = () => {
    toast({
      title: "Receipt Upload",
      description: "Feature coming soon!",
    });
  };

  return (
    <Card className="card-gradient">
      <CardHeader>
        <CardTitle className="text-xl">Add New Expense</CardTitle>
        <CardDescription>Enter the details of your expense</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="e.g. Grocery shopping"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-muted-foreground">$</span>
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                className="pl-8"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                step="0.01"
                min="0"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Food">Food</SelectItem>
                <SelectItem value="Transport">Transport</SelectItem>
                <SelectItem value="Housing">Housing</SelectItem>
                <SelectItem value="Utilities">Utilities</SelectItem>
                <SelectItem value="Entertainment">Entertainment</SelectItem>
                <SelectItem value="Shopping">Shopping</SelectItem>
                <SelectItem value="Health">Health</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-center gap-4 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleReceiptUpload}
              className="flex-1"
            >
              <Receipt className="mr-2 h-4 w-4" />
              Upload Receipt
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleVoiceInput}
              className={`flex-1 ${isListening ? 'bg-red-100 border-red-300 text-red-700' : ''}`}
            >
              <Mic className="mr-2 h-4 w-4" />
              {isListening ? 'Listening...' : 'Voice Input'}
            </Button>
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full bg-finpal-600 hover:bg-finpal-700">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Expense
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
