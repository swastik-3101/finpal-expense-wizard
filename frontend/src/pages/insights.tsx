import { useState, useEffect, useRef } from 'react';
import api from '../api/apiConfig';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Mover {
  ticker: string;
  price: string;
  change_amount: string;
  change_percentage: string;
  volume: string;
}

interface StockData {
  gainers: Mover[];
  losers: Mover[];
  active: Mover[];
  lastUpdated: string | null;
}

// ─── AI Analysis renderer (markdown-lite) ────────────────────────────────────
function AnalysisText({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <div style={styles.analysisText}>
      {lines.map((line, i) => {
        if (line.startsWith('## ')) {
          return <h3 key={i} style={styles.analysisH2}>{line.replace('## ', '')}</h3>;
        }
        if (line.startsWith('### ')) {
          return <h4 key={i} style={styles.analysisH3}>{line.replace('### ', '')}</h4>;
        }
        if (line.startsWith('**') && line.endsWith('**')) {
          return <p key={i} style={styles.analysisBold}>{line.replace(/\*\*/g, '')}</p>;
        }
        if (line.startsWith('• ') || line.startsWith('- ') || line.startsWith('* ')) {
          return (
            <div key={i} style={styles.analysisBullet}>
              <span style={styles.bulletDot}>▸</span>
              <span>{line.slice(2)}</span>
            </div>
          );
        }
        if (/^\d+\./.test(line)) {
          return (
            <div key={i} style={styles.analysisBullet}>
              <span style={styles.bulletDot}>{line.match(/^\d+/)?.[0]}.</span>
              <span>{line.replace(/^\d+\.\s*/, '')}</span>
            </div>
          );
        }
        if (line.trim() === '') return <div key={i} style={{ height: '0.5rem' }} />;
        // inline bold
        const parts = line.split(/\*\*(.*?)\*\*/g);
        return (
          <p key={i} style={styles.analysisP}>
            {parts.map((part, j) =>
              j % 2 === 1 ? <strong key={j} style={{ color: '#f1f5f9' }}>{part}</strong> : part
            )}
          </p>
        );
      })}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Insights() {
  const [stockData, setStockData] = useState<StockData | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState('');

  const [analysis, setAnalysis] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);
  const analysisRef = useRef<HTMLDivElement>(null);

  // ── Load market data on mount ──
  useEffect(() => {
    const load = async () => {
      setDataLoading(true);
      setDataError('');
      try {
        const res = await api.get('/insights/stock-data');
        setStockData(res.data);
      } catch {
        setDataError('Failed to load market data. Check your API keys.');
      } finally {
        setDataLoading(false);
      }
    };
    load();
  }, []);

  // ── Stream AI analysis ──
  const runAnalysis = async () => {
    setAnalyzing(true);
    setAnalyzed(false);
    setAnalysis('');

    try {
      const token = localStorage.getItem('finpal_token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000/api'}/insights/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Analysis request failed');

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const raw = line.slice(6).trim();
            if (raw === '[DONE]') break;
            try {
              const parsed = JSON.parse(raw);
              if (parsed.text) {
                setAnalysis(prev => prev + parsed.text);
                setTimeout(() => {
                  analysisRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
                }, 50);
              }
            } catch { /* skip malformed */ }
          }
        }
      }

      setAnalyzed(true);
    } catch (err) {
      setAnalysis('Failed to get AI analysis. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div style={styles.page}>
      {/* ── Header ── */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Stock Insights</h1>
          <p style={styles.subtitle}>
            Real-time market movers · AI-powered investment analysis
          </p>
        </div>
        {stockData?.lastUpdated && (
          <div style={styles.lastUpdated}>
            Updated: {stockData.lastUpdated}
          </div>
        )}
      </div>

      {dataError && <div style={styles.errorBox}>{dataError}</div>}

      {/* ── AI Analysis ── */}
      <div style={styles.sectionCard}>
        <div style={styles.sectionHeader}>
          <span style={styles.sectionTitle}>AI Investment Analysis</span>
        </div>

        {!analyzed && !analyzing && (
          <div style={styles.analyzePrompt}>
            <div style={styles.analyzeIcon}>🤖</div>
            <p style={styles.analyzeDesc}>
              Click below to get an AI-powered analysis of today's market movers.
              The model will identify the best stocks to consider and explain its reasoning.
            </p>
            <button
              style={styles.analyzeBtn}
              onClick={runAnalysis}
              disabled={dataLoading || !!dataError}
            >
              Analyze Today's Market
            </button>
          </div>
        )}

        {analyzing && !analysis && (
          <div style={styles.loadingText}>
            <span style={styles.pulse}>●</span> Analyzing market data…
          </div>
        )}

        {analysis && (
          <div>
            <AnalysisText text={analysis} />
            {analyzing && (
              <span style={{ ...styles.pulse, display: 'inline-block', marginTop: '0.5rem' }}>●</span>
            )}
            <div ref={analysisRef} />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#0a0f1e', color: '#e2e8f0', fontFamily: "'DM Sans', 'Segoe UI', sans-serif", padding: '2rem' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' },
  title: { fontSize: '2rem', fontWeight: 700, color: '#f1f5f9', margin: 0, letterSpacing: '-0.5px' },
  subtitle: { color: '#64748b', margin: '0.25rem 0 0', fontSize: '0.95rem' },
  lastUpdated: { fontSize: '0.78rem', color: '#475569', background: '#111827', border: '1px solid #1e293b', borderRadius: '8px', padding: '0.4rem 0.75rem', alignSelf: 'flex-start' },
  errorBox: { background: '#450a0a', border: '1px solid #f87171', borderRadius: '8px', padding: '0.75rem 1rem', color: '#f87171', marginBottom: '1.5rem', fontSize: '0.9rem' },
  sectionCard: { background: '#111827', border: '1px solid #1e293b', borderRadius: '16px', padding: '1.5rem' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' },
  sectionTitle: { fontSize: '1rem', fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.2px' },
  aiPowered: { fontSize: '0.75rem', color: '#a78bfa', background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)', borderRadius: '999px', padding: '2px 10px' },
  loadingText: { color: '#64748b', textAlign: 'center', padding: '2rem', fontSize: '0.9rem' },
  analyzePrompt: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem 1rem', gap: '1rem', textAlign: 'center' },
  analyzeIcon: { fontSize: '2.5rem' },
  analyzeDesc: { color: '#64748b', fontSize: '0.9rem', maxWidth: 320, lineHeight: 1.6, margin: 0 },
  analyzeBtn: { background: 'linear-gradient(135deg, #6366f1, #a78bfa)', border: 'none', borderRadius: '10px', color: '#fff', padding: '0.75rem 2rem', fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer', transition: 'opacity 0.15s' },
  analysisText: { fontSize: '0.9rem', lineHeight: 1.75, color: '#cbd5e1' },
  analysisH2: { fontSize: '1.05rem', fontWeight: 700, color: '#a78bfa', margin: '1rem 0 0.4rem', borderBottom: '1px solid #1e293b', paddingBottom: '0.3rem' },
  analysisH3: { fontSize: '0.95rem', fontWeight: 700, color: '#f1f5f9', margin: '0.75rem 0 0.3rem' },
  analysisP: { margin: '0.2rem 0', color: '#94a3b8' },
  analysisBold: { fontWeight: 700, color: '#f1f5f9', margin: '0.4rem 0' },
  analysisBullet: { display: 'flex', gap: '0.5rem', margin: '0.3rem 0', alignItems: 'flex-start' },
  bulletDot: { color: '#a78bfa', fontWeight: 700, minWidth: 16, marginTop: 1 },
  pulse: { color: '#a78bfa', animation: 'pulse 1s infinite', fontSize: '0.7rem' },
};