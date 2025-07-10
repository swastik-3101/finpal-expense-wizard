import React, { useEffect, useState } from "react";
import { expenseService } from "../api/expenseService";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, AlertTriangle, TrendingUp, BrainCircuit, Lightbulb } from "lucide-react";

const genAI = new GoogleGenerativeAI("APIKEY");

const Insights = () => {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const generateInsights = async () => {
      try {
        const expenses = await expenseService.getExpenses();
        if (!Array.isArray(expenses) || expenses.length === 0) {
          setError("No expenses found for this user.");
          setLoading(false);
          return;
        }

        const formatted = expenses
          .map((e) => `${e.date} | ${e.category} | ₹${e.amount} | ${e.title}`)
          .join("\n");

        const prompt = `
          You are a personal finance assistant. Based on the user's expenses below, provide:
          - A brief summary of their spending habits
          - Notable trends or categories
          - 2–3 helpful recommendations to improve their finances
          
          FORMAT YOUR RESPONSE AS VALID JSON ONLY WITHOUT ANY CODE BLOCKS OR MARKDOWN, using the following structure:
          {
            "summary": "Main summary of spending habits",
            "trends": [
              {"title": "Trend 1 Title", "description": "Detailed description of trend 1"},
              {"title": "Trend 2 Title", "description": "Detailed description of trend 2"}
            ],
            "recommendations": [
              {"title": "Recommendation 1", "description": "Details of recommendation 1"},
              {"title": "Recommendation 2", "description": "Details of recommendation 2"}
            ]
          }
          
          Expense Data:
          Date | Category | Amount | Title
          ${formatted}`;

        const model = genAI.getGenerativeModel({ model: "models/gemini-1.5-flash" });
        const result = await model.generateContent(prompt);
        const response = await result.response.text();
        
        try {
          // Check if response is wrapped in markdown code blocks and extract the JSON
          let jsonString = response;
          
          // Handle ```json format
          if (response.includes("```json")) {
            jsonString = response.split("```json")[1].split("```")[0].trim();
          } 
          // Handle ``` format (without specifying json)
          else if (response.includes("```")) {
            jsonString = response.split("```")[1].split("```")[0].trim();
          }
          
          const parsedInsights = JSON.parse(jsonString);
          setInsights(parsedInsights);
        } catch (parseError) {
          console.error("Failed to parse Gemini response:", parseError);
          console.error("Raw response:", response);
          setError("Unable to process AI response. Please try again later.");
        }
      } catch (err) {
        console.error("Insight generation failed:", err);
        setError("Failed to generate insights. Please try again later.");
      }

      setLoading(false);
    };

    generateInsights();
  }, []);

  const InsightSection = ({ title, icon, children, className = "" }) => (
    <section className={`mb-8 ${className}`}>
      <div className="flex items-center mb-4">
        {icon}
        <h2 className="text-xl font-bold ml-2">{title}</h2>
      </div>
      {children}
    </section>
  );

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center text-blue-600">Insights, Predictions & Actions</h1>
        <div className="flex flex-col items-center justify-center space-y-3 h-64 bg-white rounded-2xl shadow-lg p-6">
          <Loader2 className="animate-spin w-10 h-10 text-blue-500" />
          <p className="text-gray-600 font-medium">Analyzing your financial patterns...</p>
          <p className="text-gray-500 text-sm">This may take a moment as we process your expense data</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center text-blue-600">Insights, Predictions & Actions</h1>
        <Card className="bg-white shadow-lg rounded-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-center text-amber-600 mb-4">
              <AlertTriangle size={32} />
            </div>
            <p className="text-center text-gray-700">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!insights) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center text-blue-600">Insights, Predictions & Actions</h1>
        <Card className="bg-white shadow-lg rounded-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-center text-gray-600 mb-4">
              <AlertTriangle size={32} />
            </div>
            <p className="text-center text-gray-700">No insights available. Please try again later.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center text-blue-600">Insights, Predictions & Actions</h1>

      <div className="grid gap-6 mb-8">
        <Card className="bg-white shadow-lg rounded-xl overflow-hidden border-t-4 border-blue-500">
          <CardContent className="p-6">
            <InsightSection
              title="Spending Summary"
              icon={<BrainCircuit className="w-6 h-6 text-blue-600" />}
            >
              <p className="text-gray-700 leading-relaxed">{insights.summary}</p>
            </InsightSection>

            <InsightSection
              title="Notable Trends"
              icon={<TrendingUp className="w-6 h-6 text-amber-600" />}
            >
              <div className="grid gap-4 md:grid-cols-2">
                {insights.trends.map((trend, index) => (
                  <Card key={index} className="bg-amber-50 border border-amber-200">
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-amber-800 mb-2">{trend.title}</h3>
                      <p className="text-gray-700 text-sm">{trend.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </InsightSection>

            <InsightSection
              title="Recommendations to Improve Finances"
              icon={<Lightbulb className="w-6 h-6 text-green-600" />}
            >
              <div className="space-y-6">
                {insights.recommendations.map((rec, index) => (
                  <div key={index} className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
                    <h3 className="font-semibold text-green-800 mb-2">
                      {index + 1}. {rec.title}
                    </h3>
                    <p className="text-gray-700">{rec.description}</p>
                  </div>
                ))}
              </div>
            </InsightSection>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Insights;
