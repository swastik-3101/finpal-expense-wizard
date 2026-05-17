import { useState } from 'react';
import api from '../api/apiConfig';

interface ChatMessage {
  role: 'assistant' | 'user';
  content: string;
}

const fmt = (n: number | null | undefined) =>
  n == null
    ? '$0.00'
    : new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(n);

export default function Insights() {
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        'Click Chatbot Analysis. I will read your saved balance and expenses, save today\'s stock snapshots automatically, and suggest a simple stock plan using only a small part of your money.',
    },
  ]);
  const [summary, setSummary] = useState<any>(null);

  const runChatbotAnalysis = async () => {
    setLoading(true);
    setMessages(prev => [
      ...prev,
      { role: 'user', content: 'Run chatbot analysis' },
      { role: 'assistant', content: 'Analyzing your expenses, saving today\'s market snapshots, and checking stock signals...' },
    ]);

    try {
      const res = await api.post('/insights/personalized-stock-analysis');

      setSummary(res.data);
      setMessages(prev => [
        ...prev.slice(0, -1),
        { role: 'assistant', content: res.data.response || 'Analysis complete, but no response was returned.' },
      ]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev.slice(0, -1),
        {
          role: 'assistant',
          content:
            err?.response?.data?.response ||
            'I could not complete the stock analysis right now. Please check your backend, market API key, and Groq key, then try again.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.shell}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>FinPal Investment Chat</h1>
            <p style={styles.subtitle}>Personalized stock guidance from your balance, expenses, and market signals</p>
          </div>
          {summary?.source && <span style={styles.sourceBadge}>{summary.source === 'ai' ? 'AI response' : 'Fallback response'}</span>}
        </div>

        <div style={styles.chatWindow}>
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              style={{
                ...styles.messageRow,
                justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              <div style={{
                ...styles.bubble,
                ...(message.role === 'user' ? styles.userBubble : styles.assistantBubble),
              }}>
                {message.content}
              </div>
            </div>
          ))}
        </div>

        {summary?.expenseSummary && (
          <div style={styles.contextStrip}>
            <div style={styles.contextItem}>
              <span style={styles.contextLabel}>Available Balance</span>
              <strong>{fmt(summary.availableBalance)}</strong>
            </div>
            <div style={styles.contextItem}>
              <span style={styles.contextLabel}>30-Day Expenses</span>
              <strong>{fmt(summary.expenseSummary.total)}</strong>
            </div>
            <div style={styles.contextItem}>
              <span style={styles.contextLabel}>Daily Spend</span>
              <strong>{fmt(summary.expenseSummary.averagePerDay)}</strong>
            </div>
            <div style={styles.contextItem}>
              <span style={styles.contextLabel}>Suggested Stock</span>
              <strong>{summary.recommendation?.symbol || 'Hold cash'}</strong>
            </div>
          </div>
        )}

        <div style={styles.composer}>
          <div style={styles.composerText}>
            Balance is read from your saved profile. Any stock suggestion uses only 5-10% of it.
          </div>
          <button style={styles.button} onClick={runChatbotAnalysis} disabled={loading}>
            {loading ? 'Analyzing...' : 'Chatbot Analysis'}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#0a0f1e',
    color: '#e2e8f0',
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    padding: '2rem',
  },
  shell: {
    maxWidth: 920,
    margin: '0 auto',
    minHeight: 'calc(100vh - 4rem)',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '1rem',
    alignItems: 'flex-start',
    background: '#111827',
    border: '1px solid #1e293b',
    borderRadius: 12,
    padding: '1.25rem 1.5rem',
  },
  title: { margin: 0, color: '#f1f5f9', fontSize: '1.6rem', fontWeight: 800 },
  subtitle: { margin: '0.3rem 0 0', color: '#64748b', fontSize: '0.92rem' },
  sourceBadge: {
    color: '#a7f3d0',
    background: '#064e3b',
    border: '1px solid rgba(52,211,153,0.25)',
    borderRadius: 999,
    padding: '0.25rem 0.75rem',
    fontSize: '0.78rem',
    whiteSpace: 'nowrap',
  },
  chatWindow: {
    flex: 1,
    background: '#111827',
    border: '1px solid #1e293b',
    borderRadius: 12,
    padding: '1.25rem',
    overflowY: 'auto',
    minHeight: 380,
  },
  messageRow: { display: 'flex', marginBottom: '0.85rem' },
  bubble: {
    maxWidth: '78%',
    borderRadius: 12,
    padding: '0.85rem 1rem',
    lineHeight: 1.65,
    fontSize: '0.94rem',
    whiteSpace: 'pre-wrap',
  },
  assistantBubble: {
    background: '#0f172a',
    border: '1px solid #1e293b',
    color: '#cbd5e1',
  },
  userBubble: {
    background: '#312e81',
    border: '1px solid rgba(167,139,250,0.28)',
    color: '#ede9fe',
  },
  contextStrip: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: '0.75rem',
  },
  contextItem: {
    background: '#111827',
    border: '1px solid #1e293b',
    borderRadius: 10,
    padding: '0.8rem 0.95rem',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  contextLabel: {
    color: '#64748b',
    fontSize: '0.72rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  composer: {
    display: 'grid',
    gridTemplateColumns: '1fr auto',
    gap: '0.85rem',
    alignItems: 'end',
    background: '#111827',
    border: '1px solid #1e293b',
    borderRadius: 12,
    padding: '1rem',
  },
  composerText: {
    color: '#94a3b8',
    fontSize: '0.9rem',
    lineHeight: 1.5,
  },
  button: {
    background: '#4f46e5',
    border: '1px solid rgba(167,139,250,0.28)',
    borderRadius: 8,
    color: '#fff',
    padding: '0.78rem 1.25rem',
    fontSize: '0.95rem',
    fontWeight: 800,
    cursor: 'pointer',
    minWidth: 170,
  },
};
