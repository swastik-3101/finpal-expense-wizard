import { useState, useRef, useEffect } from "react";

const CHAT_SERVER = "http://localhost:8001";

// Parse the session metadata appended at end of stream
function parseStreamEnd(text) {
    const match = text.match(/__SESSION_ID__(.+?)__MEMORIES_USED__(\d+)__/);
    if (match) return { sessionId: match[1], memoriesUsed: parseInt(match[2]) };
    return null;
}

function cleanReply(text) {
    return text.replace(/__SESSION_ID__.+?__MEMORIES_USED__\d+__/, "").trim();
}

export default function FinPalChat({ authToken }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [isStreaming, setIsStreaming] = useState(false);
    const [sessionId, setSessionId] = useState(null);
    const [memoriesUsed, setMemoriesUsed] = useState(null);
    const [sessions, setSessions] = useState([]);
    const [showSidebar, setShowSidebar] = useState(false);
    const bottomRef = useRef(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    useEffect(() => {
        fetchSessions();
    }, []);

    const fetchSessions = async () => {
        try {
            const res = await fetch(`${CHAT_SERVER}/chat/sessions`, {
                headers: { Authorization: `Bearer ${authToken}` },
            });
            const data = await res.json();
            setSessions(data);
        } catch (e) {
            console.error("Failed to fetch sessions", e);
        }
    };

    const loadSession = async (sid) => {
        const res = await fetch(`${CHAT_SERVER}/chat/sessions/${sid}`, {
            headers: { Authorization: `Bearer ${authToken}` },
        });
        const data = await res.json();
        setSessionId(sid);
        setMessages(
            data.messages.map((m) => ({ role: m.role, content: m.content }))
        );
        setShowSidebar(false);
    };

    const sendMessage = async () => {
        if (!input.trim() || isStreaming) return;

        const userMsg = input.trim();
        setInput("");
        setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
        setIsStreaming(true);

        // Placeholder for streaming assistant reply
        setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

        try {
            const res = await fetch(`${CHAT_SERVER}/chat/message`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${authToken}`,
                },
                body: JSON.stringify({ message: userMsg, session_id: sessionId }),
            });

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let accumulated = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                accumulated += chunk;

                // Check if stream end marker arrived
                const meta = parseStreamEnd(accumulated);
                if (meta) {
                    setSessionId(meta.sessionId);
                    setMemoriesUsed(meta.memoriesUsed);
                }

                setMessages((prev) => {
                    const updated = [...prev];
                    updated[updated.length - 1] = {
                        role: "assistant",
                        content: cleanReply(accumulated),
                    };
                    return updated;
                });
            }
        } catch (err) {
            console.error("Stream error:", err);
            setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                    role: "assistant",
                    content: "Sorry, something went wrong. Please try again.",
                };
                return updated;
            });
        } finally {
            setIsStreaming(false);
            fetchSessions();
        }
    };

    const startNewChat = () => {
        setSessionId(null);
        setMessages([]);
        setMemoriesUsed(null);
        setShowSidebar(false);
    };

    return (
        <div style={styles.wrapper}>
            {/* Sidebar */}
            {showSidebar && (
                <div style={styles.sidebar}>
                    <div style={styles.sidebarHeader}>
                        <span style={styles.sidebarTitle}>Chat History</span>
                        <button style={styles.iconBtn} onClick={() => setShowSidebar(false)}>✕</button>
                    </div>
                    <button style={styles.newChatBtn} onClick={startNewChat}>+ New Chat</button>
                    {sessions.map((s) => (
                        <div key={s.session_id} style={styles.sessionItem} onClick={() => loadSession(s.session_id)}>
                            <div style={styles.sessionPreview}>{s.last_message || "Empty session"}</div>
                            <div style={styles.sessionDate}>{new Date(s.updated_at).toLocaleDateString()}</div>
                        </div>
                    ))}
                </div>
            )}

            {/* Main chat */}
            <div style={styles.chatContainer}>
                {/* Header */}
                <div style={styles.header}>
                    <button style={styles.iconBtn} onClick={() => setShowSidebar(true)}>☰</button>
                    <div style={styles.headerTitle}>
                        <span style={styles.logo}>💸 FinPal</span>
                        {memoriesUsed !== null && (
                            <span style={styles.memoryBadge}>🧠 {memoriesUsed} memories active</span>
                        )}
                    </div>
                    <button style={styles.iconBtn} onClick={startNewChat}>✦</button>
                </div>

                {/* Messages */}
                <div style={styles.messages}>
                    {messages.length === 0 && (
                        <div style={styles.emptyState}>
                            <div style={styles.emptyIcon}>💬</div>
                            <div style={styles.emptyTitle}>Ask me anything about your spending</div>
                            <div style={styles.emptySubtitle}>
                                I remember your patterns, habits, and anomalies across sessions.
                            </div>
                            <div style={styles.suggestions}>
                                {["Why am I overspending?", "Where does most of my money go?", "Any unusual expenses this month?"].map(s => (
                                    <button key={s} style={styles.suggestionChip}
                                        onClick={() => { setInput(s); }}>
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {messages.map((msg, i) => (
                        <div key={i} style={{ ...styles.msgRow, justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                            {msg.role === "assistant" && <div style={styles.avatar}>🤖</div>}
                            <div style={{
                                ...styles.bubble,
                                ...(msg.role === "user" ? styles.userBubble : styles.aiBubble),
                            }}>
                                {msg.content || (isStreaming && i === messages.length - 1 ? (
                                    <span style={styles.cursor}>▋</span>
                                ) : "")}
                            </div>
                        </div>
                    ))}
                    <div ref={bottomRef} />
                </div>

                {/* Input */}
                <div style={styles.inputRow}>
                    <textarea
                        style={styles.textarea}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
                        }}
                        placeholder="Ask about your spending..."
                        rows={1}
                        disabled={isStreaming}
                    />
                    <button style={{ ...styles.sendBtn, opacity: isStreaming ? 0.5 : 1 }} onClick={sendMessage} disabled={isStreaming}>
                        {isStreaming ? "⋯" : "↑"}
                    </button>
                </div>
            </div>
        </div>
    );
}

const styles = {
    wrapper: { display: "flex", height: "100vh", fontFamily: "'Segoe UI', sans-serif", background: "#0f0f13" },
    sidebar: { width: 280, background: "#16161e", borderRight: "1px solid #2a2a3a", display: "flex", flexDirection: "column", padding: 16, gap: 8, overflowY: "auto" },
    sidebarHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
    sidebarTitle: { color: "#fff", fontWeight: 600 },
    newChatBtn: { background: "#5b5ef4", color: "#fff", border: "none", borderRadius: 8, padding: "10px 14px", cursor: "pointer", fontWeight: 600 },
    sessionItem: { padding: "10px 12px", borderRadius: 8, cursor: "pointer", background: "#1e1e2e", marginBottom: 4 },
    sessionPreview: { color: "#ccc", fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
    sessionDate: { color: "#666", fontSize: 11, marginTop: 4 },
    chatContainer: { flex: 1, display: "flex", flexDirection: "column", height: "100vh" },
    header: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: "1px solid #1e1e2e", background: "#13131a" },
    headerTitle: { display: "flex", alignItems: "center", gap: 10 },
    logo: { color: "#fff", fontWeight: 700, fontSize: 18 },
    memoryBadge: { background: "#1e1e40", color: "#8b8bff", fontSize: 12, padding: "3px 10px", borderRadius: 20, border: "1px solid #3a3a6a" },
    iconBtn: { background: "transparent", border: "none", color: "#888", fontSize: 18, cursor: "pointer", padding: 6 },
    messages: { flex: 1, overflowY: "auto", padding: "24px 20px", display: "flex", flexDirection: "column", gap: 16 },
    emptyState: { textAlign: "center", margin: "auto", padding: 40 },
    emptyIcon: { fontSize: 48, marginBottom: 16 },
    emptyTitle: { color: "#fff", fontSize: 20, fontWeight: 600, marginBottom: 8 },
    emptySubtitle: { color: "#666", fontSize: 14, marginBottom: 24 },
    suggestions: { display: "flex", flexDirection: "column", gap: 8, alignItems: "center" },
    suggestionChip: { background: "#1e1e2e", color: "#aaa", border: "1px solid #2e2e4e", borderRadius: 20, padding: "8px 16px", cursor: "pointer", fontSize: 13 },
    msgRow: { display: "flex", alignItems: "flex-end", gap: 8 },
    avatar: { fontSize: 20, flexShrink: 0 },
    bubble: { maxWidth: "70%", padding: "12px 16px", borderRadius: 16, fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word" },
    userBubble: { background: "#5b5ef4", color: "#fff", borderBottomRightRadius: 4 },
    aiBubble: { background: "#1e1e2e", color: "#e0e0e0", borderBottomLeftRadius: 4, border: "1px solid #2a2a3a" },
    cursor: { animation: "blink 1s step-end infinite" },
    inputRow: { display: "flex", gap: 10, padding: "16px 20px", borderTop: "1px solid #1e1e2e", background: "#13131a", alignItems: "flex-end" },
    textarea: { flex: 1, background: "#1e1e2e", border: "1px solid #2e2e4e", borderRadius: 12, color: "#fff", padding: "12px 16px", fontSize: 14, resize: "none", outline: "none", lineHeight: 1.5 },
    sendBtn: { background: "#5b5ef4", border: "none", color: "#fff", borderRadius: 12, width: 44, height: 44, fontSize: 20, cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" },
};