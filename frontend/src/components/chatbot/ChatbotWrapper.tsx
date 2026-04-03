import React, { useState } from "react";
import FinPalChat from "./FinPalChat"; // ← new component (replaces SimpleChatbot)

export default function ChatbotWrapper() {
  const [open, setOpen] = useState(false);

  // Grab the JWT your Express app stores after login.
  // Change the key if your app uses something other than "token".
  const authToken = localStorage.getItem("finpal_token");

  return (
    <>
      {/* Toggle button */}
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
          e.currentTarget.style.transform = "scale(1.1)";
          e.currentTarget.style.boxShadow = "0 6px 20px rgba(37, 99, 235, 0.4)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
          e.currentTarget.style.boxShadow = "0 4px 16px rgba(37, 99, 235, 0.3)";
        }}
      >
        {open ? "✕" : "💬"}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          style={{
            position: "fixed",
            bottom: 88,
            right: 24,
            width: "min(420px, calc(100vw - 48px))",
            height: "min(600px, calc(100vh - 120px))",
            boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
            borderRadius: 16,
            zIndex: 9998,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            animation: "slideUp 0.25s ease-out",
          }}
        >
          {!authToken ? (
            // Safety fallback if user somehow isn't logged in
            <div style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#0f0f13",
              color: "#888",
              fontSize: 14,
              padding: 24,
              textAlign: "center"
            }}>
              Please log in to use the FinPal assistant.
            </div>
          ) : (
            // FinPalChat takes over the full panel — it has its own header + input
            <FinPalChat authToken={authToken} />
          )}
        </div>
      )}

      {/* Mobile overlay */}
      {open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.3)",
            zIndex: 9997,
            display: window.innerWidth <= 640 ? "block" : "none",
          }}
          onClick={() => setOpen(false)}
        />
      )}

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }

        @media (max-width: 640px) {
          /* panel goes full-width on mobile */
          .finpal-panel {
            bottom: 88px !important;
            right: 12px !important;
            left: 12px !important;
            width: calc(100vw - 24px) !important;
            height: calc(100vh - 140px) !important;
          }
        }
      `}</style>
    </>
  );
}