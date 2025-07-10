import { useState } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";

type Message = {
  sender: "user" | "bot";
  text: string;
};

export default function SimpleChatbot() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const GEMINI_API_KEY = "APIKEY"; 

  // Fetch expense summary context from backend
  const fetchContext = async () => {
    try {
      const token = localStorage.getItem("finpal_token"); // adjust if your token key is different
      const res = await fetch("http://localhost:4000/api/expenses/chat-context", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        throw new Error("Failed to fetch context");
      }
      const data = await res.json();
      return data.context;
    } catch (err) {
      console.error("Failed to fetch context:", err);
      return null;
    }
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    const newMessages = [...messages, { sender: "user", text: input }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const context = await fetchContext();

      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      // Add the context to systemInstruction if available
      const systemText = `You are a helpful assistant on a personal finance website called FinPal.
      FinPal helps users manage their money by tracking expenses, generating insights, analyzing spending patterns, and offering budget suggestions.
      When users ask about the app, guide them on how to use its features like adding expenses, viewing analytics, and getting financial tips.
      Always respond in a short, concise, and clear manner. Avoid lengthy explanations.
      ${context ? `Here is the user's expense summary for context: ${context}` : ''}`;

      const chat = model.startChat({
        history: newMessages.map((m) => ({
          role: m.sender === "user" ? "user" : "model",
          parts: [{ text: m.text }],
        })),
        systemInstruction: {
          role: "system",
          parts: [{ text: systemText }],
        },
      });

      const result = await chat.sendMessage(input);
      const reply = result.response.text();

      setMessages([...newMessages, { sender: "bot", text: reply }]);
    } catch (error) {
      console.error("Gemini API error:", error);
      setMessages([
        ...newMessages,
        { sender: "bot", text: "Sorry, something went wrong." },
      ]);
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-full max-h-96 w-full md:w-96 border rounded shadow-lg bg-white">
      <div className="flex-1 overflow-y-auto space-y-2 p-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`text-sm ${msg.sender === "user" ? "text-right" : "text-left"}`}
          >
            <div
              className={`inline-block p-2 rounded-lg ${
                msg.sender === "user"
                  ? "bg-blue-100 text-blue-800"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        {loading && <div className="text-center text-gray-500">Loading...</div>}
      </div>
      <div className="flex gap-2 p-2 border-t">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask me something..."
          className="flex-1 border p-2 rounded text-sm"
          disabled={loading}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              sendMessage();
            }
          }}
        />
        <button
          onClick={sendMessage}
          className="bg-blue-600 text-white px-4 rounded text-sm"
          disabled={loading}
        >
          Send
        </button>
      </div>
    </div>
  );
}
