import { useEffect, useState } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { MessageSquare, X } from "lucide-react";

type Message = {
  sender: "user" | "bot";
  text: string;
};

export default function SimpleChatbot() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [context, setContext] = useState("");
  const [open, setOpen] = useState(false);

  const GEMINI_API_KEY = "AIzaSyBGfMhJ7RhVPpCp3YvZZ_Pt7p6sg6pYQwo";

  // Fetch backend context
  useEffect(() => {
    const fetchContext = async () => {
      try {
        const res = await fetch("/api/expenses/chat-context", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("finpal_token")}`,
          },
        });

        const data = await res.json();
        setContext(data.context);
      } catch (err) {
        console.error("Failed to fetch context:", err);
        setContext("Could not load user financial context.");
      }
    };

    fetchContext();
  }, []);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const newMessages = [...messages, { sender: "user", text: input }];
    setMessages(newMessages);
    setInput("");

    try {
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

      const chat = model.startChat({
        history: newMessages.map((m) => ({
          role: m.sender === "user" ? "user" : "model",
          parts: [{ text: m.text }],
        })),
        systemInstruction: {
          role: "system",
          parts: [
            {
              text:
                "You are a helpful assistant on a personal finance website called FinPal. " +
                "FinPal helps users manage their money by tracking expenses, generating insights, analyzing spending patterns, and offering budget suggestions. " +
                "Always respond in a short, concise, and clear manner. Avoid lengthy explanations.\n\n" +
                `User's recent expense summary:\n${context}`,
            },
          ],
        },
      });

      const result = await chat.sendMessage(input);
      const reply = result.response.text();

      setMessages([...newMessages, { sender: "bot", text: reply }]);
    } catch (error) {
      console.error("Gemini error:", error);
      setMessages([
        ...newMessages,
        { sender: "bot", text: "Sorry, something went wrong." },
      ]);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {open ? (
        <div className="w-80 h-96 bg-white border shadow-xl rounded-lg flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-2 border-b bg-blue-600 text-white rounded-t-lg">
            <span className="text-sm font-semibold">FinPal Assistant</span>
            <button onClick={() => setOpen(false)}>
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto space-y-2 px-2 py-1">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`text-sm ${
                  msg.sender === "user" ? "text-right" : "text-left"
                }`}
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
          </div>

          {/* Input */}
          <div className="flex gap-1 p-2 border-t">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything..."
              className="flex-1 border px-2 py-1 rounded text-sm"
            />
            <button
              onClick={sendMessage}
              className="bg-blue-600 text-white px-3 py-1 rounded text-sm"
            >
              Send
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-3 shadow-lg"
        >
          <MessageSquare size={20} />
        </button>
      )}
    </div>
  );
}
