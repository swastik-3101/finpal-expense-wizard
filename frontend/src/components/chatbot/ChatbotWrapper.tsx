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
          bottom: 24,
          right: 24,
          zIndex: 9999,
          borderRadius: "50%",
          backgroundColor: "#2563EB",
          color: "white",
          width: 56,
          height: 56,
          border: "none",
          cursor: "pointer",
          fontSize: 24,
          boxShadow: "0 4px 16px rgba(37, 99, 235, 0.3)",
          transition: "all 0.2s ease-in-out",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        aria-label="Toggle chatbot"
        title="Chat with FinPal"
        onMouseEnter={(e) => {
          e.target.style.transform = "scale(1.1)";
          e.target.style.boxShadow = "0 6px 20px rgba(37, 99, 235, 0.4)";
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = "scale(1)";
          e.target.style.boxShadow = "0 4px 16px rgba(37, 99, 235, 0.3)";
        }}
      >
        {open ? "✕" : "💬"}
      </button>

      {/* Chatbot panel */}
      {open && (
        <div
          style={{
            position: "fixed",
            bottom: 88,
            right: 24,
            width: "min(380px, calc(100vw - 48px))",
            height: "min(450px, calc(100vh - 200px))",
            maxHeight: "70vh",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.12)",
            borderRadius: 12,
            backgroundColor: "white",
            zIndex: 9998,
            display: "flex",
            flexDirection: "column",
            border: "1px solid rgba(0, 0, 0, 0.08)",
            overflow: "hidden",
            animation: "slideUp 0.3s ease-out",
          }}
        >
          {/* Header */}
          <div
            style={{
              backgroundColor: "#2563EB",
              color: "white",
              padding: "16px 20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderRadius: "12px 12px 0 0",
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
                FinPal Assistant
              </h3>
              <p style={{ margin: 0, fontSize: 12, opacity: 0.9 }}>
                How can I help you today?
              </p>
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{
                background: "none",
                border: "none",
                color: "white",
                fontSize: 18,
                cursor: "pointer",
                padding: 4,
                borderRadius: 4,
                opacity: 0.8,
                transition: "opacity 0.2s",
              }}
              onMouseEnter={(e) => e.target.style.opacity = "1"}
              onMouseLeave={(e) => e.target.style.opacity = "0.8"}
              aria-label="Close chatbot"
            >
              ✕
            </button>
          </div>
          
          {/* Chatbot content */}
          <div style={{ 
            flex: 1, 
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            minHeight: 0
          }}>
            <SimpleChatbot />
          </div>
        </div>
      )}

      {/* Overlay for mobile */}
      {open && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.1)",
            zIndex: 9997,
            display: window.innerWidth <= 640 ? "block" : "none",
          }}
          onClick={() => setOpen(false)}
        />
      )}

      <style jsx>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @media (max-width: 640px) {
          .chatbot-panel {
            bottom: 88px !important;
            right: 12px !important;
            left: 12px !important;
            width: calc(100vw - 24px) !important;
            height: calc(100vh - 140px) !important;
            max-height: 75vh !important;
          }
        }
      `}</style>
    </>
  );
}