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

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtVol = (v: string) => {
  const n = parseFloat(v);
  if (isNaN(n)) return v;
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return v;
};

const isPositive = (pct: string) => !pct.startsWith('-');

// ─── Mover Card ───────────────────────────────────────────────────────────────
function MoverCard({ m, rank }: { m: Mover; rank: number }) {
  const pos = isPositive(m.change_percentage);
  const color = pos ? '#34d399' : '#f87171';
  const bg = pos ? 'rgba(52,211,153,0.06)' : 'rgba(248,113,113,0.06)';
  const border = pos ? 'rgba(52,211,153,0.15)' : 'rgba(248,113,113,0.15)';

  return (
    <div style={{ ...styles.moverCard, background: bg, borderColor: border }}>
      <div style={styles.moverRank}>#{rank}</div>
      <div style={styles.moverBody}>
        <div style={styles.moverTicker}>{m.ticker}</div>
        <div style={styles.moverPrice}>${parseFloat(m.price).toFixed(2)}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ color, fontWeight: 700, fontSize: '0.9rem' }}>
          {pos ? '+' : ''}{m.change_percentage}
        </div>
        <div style={styles.moverVol}>Vol: {fmtVol(m.volume)}</div>
      </div>
    </div>
  );
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
  const [activeTab, setActiveTab] = useState<'gainers' | 'losers' | 'active'>('gainers');

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

  const currentList = stockData
    ? activeTab === 'gainers' ? stockData.gainers
      : activeTab === 'losers' ? stockData.losers
        : stockData.active
    : [];

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

      <div style={styles.layout}>
        {/* ── LEFT: Market Data ── */}
        <div style={styles.leftPanel}>
          <div style={styles.sectionCard}>
            <div style={styles.sectionHeader}>
              <span style={styles.sectionTitle}>Market Movers</span>
              <div style={styles.miniTabBar}>
                {(['gainers', 'losers', 'active'] as const).map(t => (
                  <button key={t} onClick={() => setActiveTab(t)}
                    style={{ ...styles.miniTab, ...(activeTab === t ? styles.miniTabActive : {}) }}>
                    {t === 'gainers' ? '▲ Gainers' : t === 'losers' ? '▼ Losers' : '⚡ Active'}
                  </button>
                ))}
              </div>
            </div>

            {dataLoading ? (
              <div style={styles.loadingText}>Loading market data…</div>
            ) : (
              <div style={styles.moverList}>
                {currentList.slice(0, 10).map((m, i) => (
                  <MoverCard key={m.ticker} m={m} rank={i + 1} />
                ))}
              </div>
            )}
          </div>

          {/* ── Stats strip ── */}
          {stockData && !dataLoading && (
            <div style={styles.statsStrip}>
              <StatPill label="Gainers" value={stockData.gainers.length} color="#34d399" />
              <StatPill label="Losers" value={stockData.losers.length} color="#f87171" />
              <StatPill label="Active" value={stockData.active.length} color="#a78bfa" />
              <StatPill
                label="Top Gain"
                value={stockData.gainers[0]?.change_percentage || '—'}
                color="#34d399"
              />
              <StatPill
                label="Top Loss"
                value={stockData.losers[0]?.change_percentage || '—'}
                color="#f87171"
              />
            </div>
          )}
        </div>

        {/* ── RIGHT: AI Analysis ── */}
        <div style={styles.rightPanel}>
          <div style={styles.sectionCard}>
            <div style={styles.sectionHeader}>
              <span style={styles.sectionTitle}>AI Investment Analysis</span>
              <span style={styles.aiPowered}>⚡ Llama 3.3 70B</span>
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
                {analyzed && (
                  <button
                    style={styles.rerunBtn}
                    onClick={runAnalysis}
                  >
                    ↻ Re-analyze
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function StatPill({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div style={styles.statPill}>
      <span style={styles.statLabel}>{label}</span>
      <span style={{ ...styles.statValue, color }}>{value}</span>
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
  layout: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' },
  leftPanel: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  rightPanel: {},
  sectionCard: { background: '#111827', border: '1px solid #1e293b', borderRadius: '16px', padding: '1.5rem' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' },
  sectionTitle: { fontSize: '1rem', fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.2px' },
  aiPowered: { fontSize: '0.75rem', color: '#a78bfa', background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)', borderRadius: '999px', padding: '2px 10px' },
  miniTabBar: { display: 'flex', gap: '0.2rem', background: '#0f172a', borderRadius: '8px', padding: '3px' },
  miniTab: { background: 'none', border: 'none', color: '#64748b', padding: '0.3rem 0.7rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 500, whiteSpace: 'nowrap' },
  miniTabActive: { background: '#1e293b', color: '#f1f5f9' },
  loadingText: { color: '#64748b', textAlign: 'center', padding: '2rem', fontSize: '0.9rem' },
  moverList: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  moverCard: { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 0.85rem', borderRadius: '10px', border: '1px solid', transition: 'opacity 0.15s' },
  moverRank: { fontSize: '0.72rem', color: '#475569', minWidth: 20, fontWeight: 600 },
  moverBody: { flex: 1 },
  moverTicker: { fontWeight: 700, color: '#f1f5f9', fontSize: '0.92rem', letterSpacing: '0.03em' },
  moverPrice: { fontSize: '0.8rem', color: '#94a3b8', marginTop: 1 },
  moverVol: { fontSize: '0.72rem', color: '#475569', marginTop: 2 },
  statsStrip: { display: 'flex', gap: '0.5rem', flexWrap: 'wrap' },
  statPill: { flex: 1, minWidth: 80, background: '#111827', border: '1px solid #1e293b', borderRadius: '10px', padding: '0.6rem 0.75rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 },
  statLabel: { fontSize: '0.7rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' },
  statValue: { fontSize: '0.95rem', fontWeight: 700 },
  analyzePrompt: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem 1rem', gap: '1rem', textAlign: 'center' },
  analyzeIcon: { fontSize: '2.5rem' },
  analyzeDesc: { color: '#64748b', fontSize: '0.9rem', maxWidth: 320, lineHeight: 1.6, margin: 0 },
  analyzeBtn: { background: 'linear-gradient(135deg, #6366f1, #a78bfa)', border: 'none', borderRadius: '10px', color: '#fff', padding: '0.75rem 2rem', fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer', transition: 'opacity 0.15s' },
  rerunBtn: { marginTop: '1.25rem', background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#94a3b8', padding: '0.5rem 1.25rem', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 500 },
  analysisText: { fontSize: '0.9rem', lineHeight: 1.75, color: '#cbd5e1' },
  analysisH2: { fontSize: '1.05rem', fontWeight: 700, color: '#a78bfa', margin: '1rem 0 0.4rem', borderBottom: '1px solid #1e293b', paddingBottom: '0.3rem' },
  analysisH3: { fontSize: '0.95rem', fontWeight: 700, color: '#f1f5f9', margin: '0.75rem 0 0.3rem' },
  analysisP: { margin: '0.2rem 0', color: '#94a3b8' },
  analysisBold: { fontWeight: 700, color: '#f1f5f9', margin: '0.4rem 0' },
  analysisBullet: { display: 'flex', gap: '0.5rem', margin: '0.3rem 0', alignItems: 'flex-start' },
  bulletDot: { color: '#a78bfa', fontWeight: 700, minWidth: 16, marginTop: 1 },
  pulse: { color: '#a78bfa', animation: 'pulse 1s infinite', fontSize: '0.7rem' },
};
