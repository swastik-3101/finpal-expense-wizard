import React, { useState } from "react";
import SimpleChatbot from "./SimpleChatbot";

export default function ChatbotWrapper() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Button to toggle chatbot open/close */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          position: "fixed",
          bottom: 20,
          right: 20,
          zIndex: 1000,
          borderRadius: "50%",
          backgroundColor: "#2563EB", // blue-600
          color: "white",
          width: 50,
          height: 50,
          border: "none",
          cursor: "pointer",
          fontSize: 24,
        }}
        aria-label="Toggle chatbot"
        title="Chat with FinPal"
      >
        💬
      </button>

      {/* Chatbot panel */}
      {open && (
        <div
          style={{
            position: "fixed",
            bottom: 80,
            right: 20,
            width: 320,
            height: 400,
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            borderRadius: 8,
            backgroundColor: "white",
            zIndex: 1000,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <SimpleChatbot />
        </div>
      )}
    </>
  );
}
