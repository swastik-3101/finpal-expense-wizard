import React, { useEffect, useState } from "react";
import { expenseService } from "../api/expenseService";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

const genAI = new GoogleGenerativeAI("AIzaSyCpGkghu3f4x5M1fmaSYNeDxwuCto3LBzI");

const Insights = () => {
  const [insights, setInsights] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const generateInsights = async () => {
      try {
        const expenses = await expenseService.getExpenses();
        if (!Array.isArray(expenses) || expenses.length === 0) {
          setInsights("No expenses found for this user.");
          setLoading(false);
          return;
        }
        console.log("Expenses data:", expenses);

        const formatted = expenses
          .map((e) => `${e.date} | ${e.category} | ₹${e.amount} | ${e.title}`)
          .join("\n");

        const prompt = `
You are a personal finance assistant. Based on the user's expenses below, provide:
- A brief summary of their spending habits
- Notable trends or categories
- 2–3 helpful recommendations to improve their finances

Expense Data:
Date | Category | Amount | Title
${formatted}
        `;

        const model = genAI.getGenerativeModel({ model: "models/gemini-1.5-flash" });
        const result = await model.generateContent(prompt);
        const text = await result.response.text();
        setInsights(text);
      } catch (err) {
        console.error("Insight generation failed:", err);
        setInsights("❌ Failed to generate insights.");
      }

      setLoading(false);
    };

    generateInsights();
  }, []);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center text-primary">Insights, Predictions & Actions</h1>

      {loading ? (
        <div className="flex flex-col items-center justify-center space-y-3 h-48">
          <Loader2 className="animate-spin w-6 h-6 text-gray-500" />
          <p className="text-gray-600">Generating insights based on your expenses...</p>
        </div>
      ) : (
        <Card className="bg-white shadow-xl rounded-2xl">
          <CardContent className="prose max-w-none p-6 whitespace-pre-wrap text-gray-800">
            {insights}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Insights;
