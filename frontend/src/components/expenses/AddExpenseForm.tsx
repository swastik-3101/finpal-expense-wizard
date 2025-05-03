import { useState, useRef } from "react";
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
import { PlusCircle, Receipt, Mic, Loader2 } from "lucide-react";
import { expenseService } from "@/api/expenseService";

const SpeechRecognition =
  window.SpeechRecognition || (window as any).webkitSpeechRecognition;

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
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
  };

  const handleVoiceInput = () => {
    if (!SpeechRecognition) {
      toast({
        title: "Not Supported",
        description: "Your browser does not support speech recognition.",
        variant: "destructive",
      });
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    setIsListening(true);
    recognition.start();

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript.toLowerCase();
      console.log("Transcript:", transcript);

      const amountMatch = transcript.match(/\$?(\d+(\.\d{1,2})?)/);
      const categoryMatch = transcript.match(
        /(food|transport|housing|utilities|entertainment|shopping|health|other)/i
      );
      const titleMatch = transcript
        .replace(/\$?\d+(\.\d{1,2})?/, "")
        .replace(categoryMatch?.[0] || "", "")
        .trim();

      if (amountMatch) setAmount(amountMatch[1]);
      if (categoryMatch) setCategory(capitalize(categoryMatch[0]));
      if (titleMatch) setTitle(titleMatch);

      toast({
        title: "Voice Recognized",
        description: "Expense fields updated from voice input.",
      });
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      toast({
        title: "Error",
        description: "Voice recognition failed. Please try again.",
        variant: "destructive",
      });
      console.error("Voice Error:", event.error);
    };

    recognition.onend = () => {
      setIsListening(false);
    };
  };

  const capitalize = (str: string) =>
    str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();

  const handleFileInputChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("receipt", file);

      const result = await expenseService.uploadReceipt(formData);

      if (result.data) {
        setTitle(result.data.title || "");
        setAmount(result.data.amount ? result.data.amount.toString() : "");
        setCategory(result.data.category || "");
      }

      toast({
        title: "Success",
        description: "Receipt processed successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process receipt",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleReceiptUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
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
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileInputChange}
            className="hidden"
            accept="image/*"
          />
          <div className="flex justify-center gap-4 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleReceiptUpload}
              className="flex-1"
              disabled={isUploading}
            >
              {isUploading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Receipt className="mr-2 h-4 w-4" />
              )}
              {isUploading ? "Processing..." : "Upload Receipt"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleVoiceInput}
              className={`flex-1 ${
                isListening ? "bg-red-100 border-red-300 text-red-700" : ""
              }`}
            >
              <Mic className="mr-2 h-4 w-4" />
              {isListening ? "Listening..." : "Voice Input"}
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
