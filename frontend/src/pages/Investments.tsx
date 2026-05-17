import { useState, useEffect, useCallback, useRef } from 'react';
import {
    investmentService,
    marketService,
    stockLearningService,
    PortfolioItem,
    PortfolioSummary,
    InvestmentTransaction,
    SymbolSearchResult,
    StockProfile,
    StockFundamentals,
    StockPrice,
    Candle,
    Mover,
    DashboardData,
    StockSnapshotInput,
    StockRecommendation,
} from '../api/investmentService';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number | null | undefined) =>
    n == null ? '—' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n);

const fmtNum = (n: number | null | undefined, decimals = 2) =>
    n == null ? '—' : n.toFixed(decimals);

const pct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;

const fmtVol = (v: string) => {
    const n = parseFloat(v);
    if (isNaN(n)) return v;
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
    return v;
};

type Tab = 'portfolio' | 'trade' | 'transactions' | 'market' | 'search' | 'signals';

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Investments() {
    const [tab, setTab] = useState<Tab>('portfolio');

    // Portfolio state
    const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
    const [summary, setSummary] = useState<PortfolioSummary | null>(null);
    const [transactions, setTransactions] = useState<InvestmentTransaction[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Trade form
    const [symbol, setSymbol] = useState('');
    const [quantity, setQuantity] = useState('');
    const [tradeLoading, setTradeLoading] = useState(false);
    const [tradeMsg, setTradeMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Market dashboard
    const [dashboard, setDashboard] = useState<DashboardData | null>(null);
    const [dashboardLoading, setDashboardLoading] = useState(false);
    const [moverTab, setMoverTab] = useState<'gainers' | 'losers' | 'active'>('gainers');

    // Search / Stock detail
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<SymbolSearchResult[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
    const [stockProfile, setStockProfile] = useState<StockProfile | null>(null);
    const [stockFundamentals, setStockFundamentals] = useState<StockFundamentals | null>(null);
    const [stockPrice, setStockPrice] = useState<StockPrice | null>(null);
    const [candles, setCandles] = useState<Candle[]>([]);
    const [stockLoading, setStockLoading] = useState(false);
    const [detailTab, setDetailTab] = useState<'overview' | 'fundamentals' | 'chart'>('overview');

    // Stock learning signals
    const [signalForm, setSignalForm] = useState({
        symbol: '',
        price: '',
        volume: '',
        rsi: '',
        priceChange: '',
        avgVolume: '',
    });
    const [signalSnapshots, setSignalSnapshots] = useState<StockSnapshotInput[]>([]);
    const [recommendations, setRecommendations] = useState<StockRecommendation[]>([]);
    const [signalLoading, setSignalLoading] = useState(false);
    const [signalMsg, setSignalMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
    const [confidenceThreshold, setConfidenceThreshold] = useState('0.6');
    const [learningDate, setLearningDate] = useState('');
    const [learningResult, setLearningResult] = useState<any>(null);

    const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ── Loaders ──
    const loadPortfolio = useCallback(async () => {
        setLoading(true); setError('');
        try {
            const [pRes, sRes] = await Promise.all([
                investmentService.getPortfolio(),
                investmentService.getPortfolioSummary(),
            ]);
            setPortfolio(pRes.data);
            setSummary(sRes.data);
        } catch { setError('Failed to load portfolio.'); }
        finally { setLoading(false); }
    }, []);

    const loadTransactions = useCallback(async () => {
        setLoading(true); setError('');
        try {
            const res = await investmentService.getTransactions();
            setTransactions(res.data);
        } catch { setError('Failed to load transactions.'); }
        finally { setLoading(false); }
    }, []);

    const loadDashboard = useCallback(async () => {
        setDashboardLoading(true);
        try {
            const data = await marketService.getDashboard();
            setDashboard(data);
        } catch { /* silently fail */ }
        finally { setDashboardLoading(false); }
    }, []);

    useEffect(() => {
        if (tab === 'portfolio') loadPortfolio();
        if (tab === 'transactions') loadTransactions();
        if (tab === 'market') loadDashboard();
    }, [tab, loadPortfolio, loadTransactions, loadDashboard]);

    // ── Symbol search with debounce ──
    const handleSearchInput = (val: string) => {
        setSearchQuery(val);
        setSelectedSymbol(null);
        setSearchResults([]);
        if (searchTimer.current) clearTimeout(searchTimer.current);
        if (!val.trim()) return;
        searchTimer.current = setTimeout(async () => {
            setSearchLoading(true);
            try {
                const results = await marketService.searchSymbols(val.trim());
                setSearchResults(results);
            } catch { /* ignore */ }
            finally { setSearchLoading(false); }
        }, 400);
    };

    // ── Load full stock detail ──
    const loadStockDetail = async (sym: string) => {
        setSelectedSymbol(sym);
        setSearchResults([]);
        setSearchQuery(sym);
        setStockLoading(true);
        setStockProfile(null);
        setStockFundamentals(null);
        setStockPrice(null);
        setCandles([]);
        setDetailTab('overview');
        try {
            const [profile, fundamentals, price, candleRes] = await Promise.all([
                marketService.getProfile(sym),
                marketService.getFundamentals(sym),
                marketService.getCurrentPrice(sym),
                marketService.getCandles(sym),
            ]);
            setStockProfile(profile);
            setStockFundamentals(fundamentals);
            setStockPrice(price);
            setCandles(candleRes.candles || []);
        } catch { /* ignore */ }
        finally { setStockLoading(false); }
    };

    // ── Trade handler ──
    const handleTrade = async (type: 'BUY' | 'SELL') => {
        if (!symbol.trim() || !quantity || Number(quantity) <= 0) {
            setTradeMsg({ type: 'error', text: 'Enter a valid symbol and quantity.' });
            return;
        }
        setTradeLoading(true); setTradeMsg(null);
        try {
            const fn = type === 'BUY' ? investmentService.buyStock : investmentService.sellStock;
            const res = await fn({ symbol: symbol.trim().toUpperCase(), quantity: Number(quantity) });
            setTradeMsg({ type: 'success', text: res.message });
            setSymbol(''); setQuantity('');
        } catch (err: any) {
            setTradeMsg({ type: 'error', text: err?.response?.data?.message || 'Trade failed.' });
        } finally { setTradeLoading(false); }
    };

    const buildSignalSnapshot = (): StockSnapshotInput | null => {
        const symbolValue = signalForm.symbol.trim().toUpperCase();
        const price = Number(signalForm.price);
        const volume = Number(signalForm.volume);
        const rsi = Number(signalForm.rsi);
        const priceChange = signalForm.priceChange === '' ? undefined : Number(signalForm.priceChange);
        const avgVolume = signalForm.avgVolume === '' ? undefined : Number(signalForm.avgVolume);

        if (!symbolValue || !Number.isFinite(price) || !Number.isFinite(volume) || !Number.isFinite(rsi)) {
            setSignalMsg({ type: 'error', text: 'Symbol, price, volume, and RSI are required.' });
            return null;
        }

        return {
            symbol: symbolValue,
            price,
            volume,
            rsi,
            ...(Number.isFinite(priceChange) ? { priceChange } : {}),
            ...(Number.isFinite(avgVolume) ? { avgVolume } : {}),
        };
    };

    const resetSignalForm = () => {
        setSignalForm({ symbol: '', price: '', volume: '', rsi: '', priceChange: '', avgVolume: '' });
    };

    const saveSignalSnapshot = async () => {
        const snapshot = buildSignalSnapshot();
        if (!snapshot) return;

        setSignalLoading(true);
        setSignalMsg(null);
        try {
            const res = await stockLearningService.saveSnapshot(snapshot);
            const saved = res.snapshot || snapshot;
            setSignalSnapshots(prev => [
                ...prev,
                {
                    symbol: saved.symbol,
                    price: saved.price,
                    volume: saved.volume,
                    rsi: saved.rsi,
                    priceChange: snapshot.priceChange,
                    avgVolume: snapshot.avgVolume,
                },
            ]);
            setSignalMsg({ type: 'success', text: `${snapshot.symbol} snapshot saved and added to candidates.` });
            resetSignalForm();
        } catch (err: any) {
            setSignalMsg({ type: 'error', text: err?.response?.data?.msg || 'Failed to save snapshot.' });
        } finally {
            setSignalLoading(false);
        }
    };

    const addSignalCandidate = () => {
        const snapshot = buildSignalSnapshot();
        if (!snapshot) return;
        setSignalSnapshots(prev => [...prev, snapshot]);
        setSignalMsg({ type: 'info', text: `${snapshot.symbol} added as a recommendation candidate.` });
        resetSignalForm();
    };

    const removeSignalCandidate = (index: number) => {
        setSignalSnapshots(prev => prev.filter((_, i) => i !== index));
    };

    const loadRecommendations = async () => {
        if (!signalSnapshots.length) {
            setSignalMsg({ type: 'error', text: 'Add at least one candidate snapshot first.' });
            return;
        }

        setSignalLoading(true);
        setSignalMsg(null);
        setRecommendations([]);
        try {
            const data = await stockLearningService.recommend(signalSnapshots, {
                confidenceThreshold: Number(confidenceThreshold) || 0.6,
                includeAnalysis: true,
            });
            setRecommendations(data.recommendations);
            setSignalMsg({
                type: data.recommendations.length ? 'success' : 'info',
                text: data.analysisMessage || `${data.recommendations.length} recommendation(s) found.`,
            });
        } catch (err: any) {
            setSignalMsg({ type: 'error', text: err?.response?.data?.msg || 'Failed to load recommendations.' });
        } finally {
            setSignalLoading(false);
        }
    };

    const runLearningUpdate = async () => {
        setSignalLoading(true);
        setSignalMsg(null);
        setLearningResult(null);
        try {
            const result = await stockLearningService.runLearning(learningDate || undefined);
            setLearningResult(result);
            setSignalMsg({ type: 'success', text: `Learning complete: ${result.updated || 0} pattern stat(s) updated.` });
        } catch (err: any) {
            setSignalMsg({ type: 'error', text: err?.response?.data?.msg || 'Learning update failed.' });
        } finally {
            setSignalLoading(false);
        }
    };

    // ── Mini candlestick chart ──
    const CandleChart = ({ data }: { data: Candle[] }) => {
        if (!data.length) return <p style={{ color: '#475569', textAlign: 'center', padding: '2rem' }}>No chart data</p>;
        const reversed = [...data].reverse();
        const closes = reversed.map(c => c.close);
        const min = Math.min(...closes);
        const max = Math.max(...closes);
        const range = max - min || 1;
        const W = 600; const H = 140; const pad = 10;
        const step = (W - pad * 2) / (closes.length - 1);
        const y = (v: number) => pad + ((max - v) / range) * (H - pad * 2);
        const points = closes.map((c, i) => `${pad + i * step},${y(c)}`).join(' ');
        const isUp = closes[closes.length - 1] >= closes[0];
        const color = isUp ? '#34d399' : '#f87171';
        return (
            <div style={{ overflowX: 'auto' }}>
                <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', minWidth: 300, height: H }}>
                    <defs>
                        <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                            <stop offset="100%" stopColor={color} stopOpacity="0" />
                        </linearGradient>
                    </defs>
                    <polygon
                        points={`${pad},${H} ${points} ${pad + (closes.length - 1) * step},${H}`}
                        fill="url(#cg)"
                    />
                    <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
                </svg>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#475569', padding: '0 10px' }}>
                    <span>{reversed[0]?.datetime}</span>
                    <span>{reversed[reversed.length - 1]?.datetime}</span>
                </div>
            </div>
        );
    };

    // ── Mover row ──
    const MoverRow = ({ m, rank }: { m: Mover; rank: number }) => {
        const isPos = !m.change_percentage.startsWith('-');
        return (
            <tr style={styles.tr}>
                <td style={{ ...styles.td, color: '#475569', fontSize: '0.8rem' }}>{rank}</td>
                <td style={{ ...styles.td, ...styles.symbolCell }}>{m.ticker}</td>
                <td style={styles.td}>${parseFloat(m.price).toFixed(2)}</td>
                <td style={{ ...styles.td, color: isPos ? '#34d399' : '#f87171' }}>
                    {isPos ? '+' : ''}{m.change_amount}
                </td>
                <td style={{ ...styles.td, color: isPos ? '#34d399' : '#f87171', fontWeight: 600 }}>
                    {isPos ? '+' : ''}{m.change_percentage}
                </td>
                <td style={{ ...styles.td, color: '#64748b' }}>{fmtVol(m.volume)}</td>
            </tr>
        );
    };

    // ── Fundamental row ──
    const FundRow = ({ label, value }: { label: string; value: string }) => (
        <div style={styles.fundRow}>
            <span style={styles.fundLabel}>{label}</span>
            <span style={styles.fundValue}>{value}</span>
        </div>
    );

    const tabs: { key: Tab; label: string }[] = [
        { key: 'portfolio', label: 'Portfolio' },
        { key: 'trade', label: 'Trade' },
        { key: 'transactions', label: 'Transactions' },
        { key: 'market', label: 'Market' },
        { key: 'search', label: 'Search' },
    ];

    return (
        <div style={styles.page}>
            {/* ── Header ── */}
            <div style={styles.header}>
                <h1 style={styles.title}>Investments</h1>
                <p style={styles.subtitle}>Track your portfolio and explore markets in real time</p>
            </div>

            {/* ── Summary Cards (portfolio tab only) ── */}
            {summary && tab === 'portfolio' && (
                <div style={styles.summaryGrid}>
                    <SummaryCard label="Total Invested" value={fmt(summary.totalInvested)} color="#a78bfa" />
                    <SummaryCard label="Current Value" value={fmt(summary.totalCurrentValue)} color="#34d399" />
                    <SummaryCard label="Total P&L" value={fmt(summary.totalProfit)} sub={pct(summary.profitPercent)} color={summary.totalProfit >= 0 ? '#34d399' : '#f87171'} />
                    <SummaryCard label="Return" value={pct(summary.profitPercent)} color={summary.profitPercent >= 0 ? '#34d399' : '#f87171'} />
                </div>
            )}

            {/* ── Tabs ── */}
            <div style={styles.tabBar}>
                {tabs.map(t => (
                    <button key={t.key} onClick={() => setTab(t.key)}
                        style={{ ...styles.tabBtn, ...(tab === t.key ? styles.tabActive : {}) }}>
                        {t.label}
                    </button>
                ))}
            </div>

            {/* ── Content ── */}
            <div style={styles.content}>
                {error && <div style={styles.errorBox}>{error}</div>}
                {loading && <div style={styles.loadingText}>Loading…</div>}

                {/* ══ PORTFOLIO TAB ══ */}
                {tab === 'portfolio' && !loading && (
                    portfolio.length === 0
                        ? <EmptyState message="No holdings yet. Buy your first stock in the Trade tab." />
                        : <div style={styles.tableWrap}>
                            <table style={styles.table}>
                                <thead><tr>
                                    {['Symbol', 'Qty', 'Avg Price', 'Current', 'Invested', 'Value', 'P&L', '%'].map(h => (
                                        <th key={h} style={styles.th}>{h}</th>
                                    ))}
                                </tr></thead>
                                <tbody>
                                    {portfolio.map(item => (
                                        <tr key={item.symbol} style={styles.tr}>
                                            <td style={{ ...styles.td, ...styles.symbolCell }}>{item.symbol}</td>
                                            <td style={styles.td}>{item.quantity}</td>
                                            <td style={styles.td}>{fmt(item.avgPrice)}</td>
                                            <td style={styles.td}>{fmt(item.currentPrice)}</td>
                                            <td style={styles.td}>{fmt(item.investedValue)}</td>
                                            <td style={styles.td}>{fmt(item.currentValue)}</td>
                                            <td style={{ ...styles.td, color: item.profit >= 0 ? '#34d399' : '#f87171' }}>{fmt(item.profit)}</td>
                                            <td style={{ ...styles.td, color: item.profitPercent >= 0 ? '#34d399' : '#f87171' }}>{pct(item.profitPercent)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                )}

                {/* ══ TRADE TAB ══ */}
                {tab === 'trade' && (
                    <div style={styles.tradeCard}>
                        <h2 style={styles.tradeTitle}>Place a Trade</h2>
                        <p style={styles.tradeSubtitle}>Buy or sell stocks at live market price</p>
                        {tradeMsg && (
                            <div style={{ ...styles.tradeMsg, background: tradeMsg.type === 'success' ? '#064e3b' : '#450a0a', borderColor: tradeMsg.type === 'success' ? '#34d399' : '#f87171' }}>
                                {tradeMsg.text}
                            </div>
                        )}
                        <div style={styles.fieldGroup}>
                            <label style={styles.label}>Stock Symbol</label>
                            <input style={styles.input} placeholder="e.g. AAPL, TSLA, MSFT" value={symbol}
                                onChange={e => setSymbol(e.target.value.toUpperCase())} />
                        </div>
                        <div style={styles.fieldGroup}>
                            <label style={styles.label}>Quantity</label>
                            <input style={styles.input} type="number" placeholder="e.g. 10" min={1}
                                value={quantity} onChange={e => setQuantity(e.target.value)} />
                        </div>
                        <div style={styles.tradeButtons}>
                            <button style={{ ...styles.tradeBtn, ...styles.buyBtn }} onClick={() => handleTrade('BUY')} disabled={tradeLoading}>
                                {tradeLoading ? '…' : '▲ Buy'}
                            </button>
                            <button style={{ ...styles.tradeBtn, ...styles.sellBtn }} onClick={() => handleTrade('SELL')} disabled={tradeLoading}>
                                {tradeLoading ? '…' : '▼ Sell'}
                            </button>
                        </div>
                    </div>
                )}

                {/* ══ TRANSACTIONS TAB ══ */}
                {tab === 'transactions' && !loading && (
                    transactions.length === 0
                        ? <EmptyState message="No transactions yet." />
                        : <div style={styles.tableWrap}>
                            <table style={styles.table}>
                                <thead><tr>
                                    {['Type', 'Symbol', 'Qty', 'Price', 'Total', 'Date'].map(h => (
                                        <th key={h} style={styles.th}>{h}</th>
                                    ))}
                                </tr></thead>
                                <tbody>
                                    {transactions.map(txn => (
                                        <tr key={txn._id} style={styles.tr}>
                                            <td style={styles.td}>
                                                <span style={{ ...styles.badge, background: txn.type === 'BUY' ? '#064e3b' : '#450a0a', color: txn.type === 'BUY' ? '#34d399' : '#f87171' }}>
                                                    {txn.type}
                                                </span>
                                            </td>
                                            <td style={{ ...styles.td, ...styles.symbolCell }}>{txn.symbol}</td>
                                            <td style={styles.td}>{txn.quantity}</td>
                                            <td style={styles.td}>{fmt(txn.price)}</td>
                                            <td style={styles.td}>{fmt(txn.price * txn.quantity)}</td>
                                            <td style={{ ...styles.td, color: '#94a3b8' }}>
                                                {new Date(txn.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                )}

                {/* ══ MARKET TAB ══ */}
                {tab === 'market' && (
                    <div>
                        {dashboardLoading && <div style={styles.loadingText}>Loading market data…</div>}
                        {!dashboardLoading && dashboard && (
                            <>
                                {/* Sub-tabs */}
                                <div style={{ ...styles.tabBar, marginBottom: '1.25rem' }}>
                                    {(['gainers', 'losers', 'active'] as const).map(t => (
                                        <button key={t} onClick={() => setMoverTab(t)}
                                            style={{ ...styles.tabBtn, ...(moverTab === t ? styles.tabActive : {}) }}>
                                            {t === 'gainers' ? '▲ Top Gainers' : t === 'losers' ? '▼ Top Losers' : '⚡ Most Active'}
                                        </button>
                                    ))}
                                </div>

                                <div style={styles.tableWrap}>
                                    <table style={styles.table}>
                                        <thead><tr>
                                            {['#', 'Symbol', 'Price', 'Change', '%', 'Volume'].map(h => (
                                                <th key={h} style={styles.th}>{h}</th>
                                            ))}
                                        </tr></thead>
                                        <tbody>
                                            {(moverTab === 'gainers' ? dashboard.gainers
                                                : moverTab === 'losers' ? dashboard.losers
                                                    : dashboard.active
                                            ).map((m, i) => <MoverRow key={m.ticker} m={m} rank={i + 1} />)}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                        {!dashboardLoading && !dashboard && (
                            <EmptyState message="Market data unavailable." />
                        )}
                    </div>
                )}

                {/* ══ SEARCH TAB ══ */}
                {tab === 'search' && (
                    <div>
                        {/* Search box */}
                        <div style={{ position: 'relative', maxWidth: 480, marginBottom: '1.5rem' }}>
                            <input
                                style={{ ...styles.input, paddingRight: '2.5rem' }}
                                placeholder="Search symbol or company name…"
                                value={searchQuery}
                                onChange={e => handleSearchInput(e.target.value)}
                            />
                            {searchLoading && (
                                <span style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '0.85rem' }}>…</span>
                            )}

                            {/* Dropdown results */}
                            {searchResults.length > 0 && (
                                <div style={styles.dropdown}>
                                    {searchResults.map(r => (
                                        <div key={r.symbol} style={styles.dropdownItem}
                                            onClick={() => loadStockDetail(r.symbol)}>
                                            <span style={{ fontWeight: 700, color: '#f1f5f9' }}>{r.symbol}</span>
                                            <span style={{ color: '#64748b', fontSize: '0.85rem', marginLeft: '0.5rem' }}>{r.name}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Stock Detail */}
                        {stockLoading && <div style={styles.loadingText}>Loading stock data…</div>}

                        {!stockLoading && selectedSymbol && (
                            <div style={styles.detailCard}>
                                {/* Stock header */}
                                {stockProfile && (
                                    <div style={styles.stockHeader}>
                                        {stockProfile.image && (
                                            <img src={stockProfile.image} alt={stockProfile.symbol}
                                                style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'contain', background: '#1e293b', padding: 4 }} />
                                        )}
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem' }}>
                                                <h2 style={{ margin: 0, color: '#f1f5f9', fontSize: '1.4rem', fontWeight: 700 }}>{stockProfile.symbol}</h2>
                                                <span style={{ color: '#94a3b8', fontSize: '0.95rem' }}>{stockProfile.companyName}</span>
                                            </div>
                                            <div style={{ color: '#475569', fontSize: '0.82rem', marginTop: 2 }}>
                                                {stockProfile.exchange} · {stockProfile.industry}
                                            </div>
                                        </div>
                                        {stockPrice && (
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#f1f5f9' }}>{fmt(stockPrice.current)}</div>
                                                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                                                    H: {fmt(stockPrice.high)} · L: {fmt(stockPrice.low)}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Detail sub-tabs */}
                                <div style={{ ...styles.tabBar, margin: '1.25rem 0' }}>
                                    {(['overview', 'fundamentals', 'chart'] as const).map(t => (
                                        <button key={t} onClick={() => setDetailTab(t)}
                                            style={{ ...styles.tabBtn, ...(detailTab === t ? styles.tabActive : {}) }}>
                                            {t.charAt(0).toUpperCase() + t.slice(1)}
                                        </button>
                                    ))}
                                </div>

                                {/* Overview */}
                                {detailTab === 'overview' && stockPrice && (
                                    <div style={styles.overviewGrid}>
                                        <FundRow label="Current Price" value={fmt(stockPrice.current)} />
                                        <FundRow label="Open" value={fmt(stockPrice.open)} />
                                        <FundRow label="Day High" value={fmt(stockPrice.high)} />
                                        <FundRow label="Day Low" value={fmt(stockPrice.low)} />
                                        <FundRow label="Prev Close" value={fmt(stockPrice.prevClose)} />
                                        {stockFundamentals && <>
                                            <FundRow label="52W High" value={fmt(stockFundamentals.high52)} />
                                            <FundRow label="52W Low" value={fmt(stockFundamentals.low52)} />
                                            <FundRow label="Market Cap" value={fmt(stockFundamentals.marketCap)} />
                                        </>}
                                        {stockProfile?.website && (
                                            <div style={styles.fundRow}>
                                                <span style={styles.fundLabel}>Website</span>
                                                <a href={stockProfile.website} target="_blank" rel="noreferrer"
                                                    style={{ color: '#a78bfa', fontSize: '0.9rem' }}>
                                                    {stockProfile.website}
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Fundamentals */}
                                {detailTab === 'fundamentals' && stockFundamentals && (
                                    <div style={styles.overviewGrid}>
                                        <FundRow label="EPS (TTM)" value={fmtNum(stockFundamentals.eps)} />
                                        <FundRow label="P/E Ratio (TTM)" value={fmtNum(stockFundamentals.peRatio)} />
                                        <FundRow label="Beta" value={fmtNum(stockFundamentals.beta)} />
                                        <FundRow label="ROE (TTM)" value={stockFundamentals.roe != null ? `${fmtNum(stockFundamentals.roe)}%` : '—'} />
                                        <FundRow label="ROA (TTM)" value={stockFundamentals.roa != null ? `${fmtNum(stockFundamentals.roa)}%` : '—'} />
                                        <FundRow label="Free Cash Flow" value={fmt(stockFundamentals.freeCashFlow)} />
                                        <FundRow label="52W High" value={fmt(stockFundamentals.high52)} />
                                        <FundRow label="52W Low" value={fmt(stockFundamentals.low52)} />
                                        <FundRow label="Market Cap" value={fmt(stockFundamentals.marketCap)} />
                                    </div>
                                )}

                                {/* Chart */}
                                {detailTab === 'chart' && (
                                    <div>
                                        <p style={{ color: '#64748b', fontSize: '0.82rem', marginBottom: '0.75rem' }}>
                                            30-day closing price — {selectedSymbol}
                                        </p>
                                        <CandleChart data={candles} />
                                    </div>
                                )}
                            </div>
                        )}

                        {!stockLoading && !selectedSymbol && !searchResults.length && (
                            <EmptyState message="Search for a symbol above to view stock details, fundamentals, and chart." />
                        )}
                    </div>
                )}

                {/* ══ SIGNALS TAB ══ */}
                {tab === 'signals' && (
                    <div style={styles.signalLayout}>
                        <div style={styles.signalPanel}>
                            <h2 style={styles.tradeTitle}>Stock Learning Signals</h2>
                            <p style={styles.tradeSubtitle}>Save snapshots, build a candidate list, and ask FinPal for learned recommendations.</p>

                            {signalMsg && (
                                <div style={{
                                    ...styles.tradeMsg,
                                    background: signalMsg.type === 'success' ? '#064e3b' : signalMsg.type === 'error' ? '#450a0a' : '#172554',
                                    borderColor: signalMsg.type === 'success' ? '#34d399' : signalMsg.type === 'error' ? '#f87171' : '#60a5fa',
                                    color: signalMsg.type === 'success' ? '#a7f3d0' : signalMsg.type === 'error' ? '#fecaca' : '#bfdbfe',
                                }}>
                                    {signalMsg.text}
                                </div>
                            )}

                            <div style={styles.signalGrid}>
                                <div style={styles.fieldGroup}>
                                    <label style={styles.label}>Symbol</label>
                                    <input style={styles.input} value={signalForm.symbol}
                                        onChange={e => setSignalForm(prev => ({ ...prev, symbol: e.target.value.toUpperCase() }))}
                                        placeholder="AAPL" />
                                </div>
                                <div style={styles.fieldGroup}>
                                    <label style={styles.label}>Price</label>
                                    <input style={styles.input} type="number" value={signalForm.price}
                                        onChange={e => setSignalForm(prev => ({ ...prev, price: e.target.value }))}
                                        placeholder="190.50" />
                                </div>
                                <div style={styles.fieldGroup}>
                                    <label style={styles.label}>Volume</label>
                                    <input style={styles.input} type="number" value={signalForm.volume}
                                        onChange={e => setSignalForm(prev => ({ ...prev, volume: e.target.value }))}
                                        placeholder="1200000" />
                                </div>
                                <div style={styles.fieldGroup}>
                                    <label style={styles.label}>RSI</label>
                                    <input style={styles.input} type="number" value={signalForm.rsi}
                                        onChange={e => setSignalForm(prev => ({ ...prev, rsi: e.target.value }))}
                                        placeholder="28" />
                                </div>
                                <div style={styles.fieldGroup}>
                                    <label style={styles.label}>Price Change %</label>
                                    <input style={styles.input} type="number" value={signalForm.priceChange}
                                        onChange={e => setSignalForm(prev => ({ ...prev, priceChange: e.target.value }))}
                                        placeholder="3.4" />
                                </div>
                                <div style={styles.fieldGroup}>
                                    <label style={styles.label}>Avg Volume</label>
                                    <input style={styles.input} type="number" value={signalForm.avgVolume}
                                        onChange={e => setSignalForm(prev => ({ ...prev, avgVolume: e.target.value }))}
                                        placeholder="900000" />
                                </div>
                            </div>

                            <div style={styles.tradeButtons}>
                                <button style={{ ...styles.tradeBtn, ...styles.buyBtn }} onClick={saveSignalSnapshot} disabled={signalLoading}>
                                    Save Snapshot
                                </button>
                                <button style={{ ...styles.tradeBtn, background: '#1e293b', color: '#cbd5e1' }} onClick={addSignalCandidate} disabled={signalLoading}>
                                    Add Candidate
                                </button>
                            </div>

                            <div style={{ ...styles.fieldGroup, marginTop: '1.5rem' }}>
                                <label style={styles.label}>Confidence Threshold</label>
                                <input style={styles.input} type="number" min="0" max="1" step="0.05"
                                    value={confidenceThreshold}
                                    onChange={e => setConfidenceThreshold(e.target.value)} />
                            </div>

                            <button style={{ ...styles.tradeBtn, width: '100%', background: '#312e81', color: '#c4b5fd' }}
                                onClick={loadRecommendations} disabled={signalLoading || !signalSnapshots.length}>
                                {signalLoading ? 'Working...' : 'Get Recommendations'}
                            </button>

                            <div style={styles.learningBox}>
                                <label style={styles.label}>Run Learning For Date</label>
                                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                                    <input style={{ ...styles.input, flex: 1, minWidth: 180 }} type="date"
                                        value={learningDate}
                                        onChange={e => setLearningDate(e.target.value)} />
                                    <button style={{ ...styles.tradeBtn, flex: '0 0 auto', background: '#0f172a', color: '#94a3b8', border: '1px solid #334155' }}
                                        onClick={runLearningUpdate} disabled={signalLoading}>
                                        Run
                                    </button>
                                </div>
                                {learningResult && (
                                    <p style={styles.learningMeta}>
                                        Evaluated {learningResult.evaluated || 0}, skipped {learningResult.skipped || 0}, errors {learningResult.errors?.length || 0}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div style={styles.signalPanel}>
                            <h2 style={styles.tradeTitle}>Candidates</h2>
                            {signalSnapshots.length === 0 ? (
                                <EmptyState message="Add snapshots to build a recommendation candidate list." />
                            ) : (
                                <div style={styles.signalList}>
                                    {signalSnapshots.map((snap, index) => (
                                        <div key={`${snap.symbol}-${index}`} style={styles.signalItem}>
                                            <div>
                                                <div style={styles.symbolCell}>{snap.symbol}</div>
                                                <div style={styles.signalMeta}>
                                                    Price {fmt(snap.price)} · RSI {snap.rsi} · Vol {snap.volume.toLocaleString()}
                                                </div>
                                            </div>
                                            <button style={styles.iconBtn} onClick={() => removeSignalCandidate(index)}>Remove</button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <h2 style={{ ...styles.tradeTitle, marginTop: '2rem' }}>Recommendations</h2>
                            {recommendations.length === 0 ? (
                                <p style={styles.signalMeta}>Recommendations will appear here after your candidates match learned patterns.</p>
                            ) : (
                                <div style={styles.recommendationList}>
                                    {recommendations.map(rec => (
                                        <div key={rec.symbol} style={styles.recommendationCard}>
                                            <div style={styles.recommendationHeader}>
                                                <span style={styles.symbolCell}>{rec.symbol}</span>
                                                <span style={styles.confidenceBadge}>{Math.round(rec.confidence * 100)}%</span>
                                            </div>
                                            <div style={styles.signalMeta}>{rec.pattern}</div>
                                            <div style={styles.signalMeta}>
                                                {rec.successCount} wins · {rec.failCount} losses · {rec.analysisSource || 'fallback'}
                                            </div>
                                            {rec.analysis && <p style={styles.analysisCopy}>{rec.analysis}</p>}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function SummaryCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
    return (
        <div style={styles.card}>
            <p style={styles.cardLabel}>{label}</p>
            <p style={{ ...styles.cardValue, color }}>{value}</p>
            {sub && <p style={{ ...styles.cardSub, color }}>{sub}</p>}
        </div>
    );
}

function EmptyState({ message }: { message: string }) {
    return (
        <div style={styles.empty}>
            <span style={styles.emptyIcon}>📭</span>
            <p style={styles.emptyText}>{message}</p>
        </div>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
    page: { minHeight: '100vh', background: '#0a0f1e', color: '#e2e8f0', fontFamily: "'DM Sans', 'Segoe UI', sans-serif", padding: '2rem' },
    header: { marginBottom: '2rem' },
    title: { fontSize: '2rem', fontWeight: 700, color: '#f1f5f9', margin: 0, letterSpacing: '-0.5px' },
    subtitle: { color: '#64748b', margin: '0.25rem 0 0', fontSize: '0.95rem' },
    summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' },
    card: { background: '#111827', border: '1px solid #1e293b', borderRadius: '12px', padding: '1.25rem 1.5rem' },
    cardLabel: { margin: 0, fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' },
    cardValue: { margin: '0.4rem 0 0', fontSize: '1.5rem', fontWeight: 700 },
    cardSub: { margin: '0.2rem 0 0', fontSize: '0.85rem', fontWeight: 500 },
    tabBar: { display: 'flex', gap: '0.25rem', background: '#111827', border: '1px solid #1e293b', borderRadius: '10px', padding: '4px', width: 'fit-content', marginBottom: '1.5rem', flexWrap: 'wrap' },
    tabBtn: { background: 'none', border: 'none', color: '#64748b', padding: '0.5rem 1.1rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 500, transition: 'all 0.15s', whiteSpace: 'nowrap' },
    tabActive: { background: '#1e293b', color: '#f1f5f9' },
    content: {},
    errorBox: { background: '#450a0a', border: '1px solid #f87171', borderRadius: '8px', padding: '0.75rem 1rem', color: '#f87171', marginBottom: '1rem', fontSize: '0.9rem' },
    loadingText: { color: '#64748b', textAlign: 'center', padding: '3rem' },
    tableWrap: { overflowX: 'auto', background: '#111827', border: '1px solid #1e293b', borderRadius: '12px' },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' },
    th: { padding: '0.85rem 1rem', textAlign: 'left' as const, color: '#64748b', fontWeight: 600, fontSize: '0.78rem', textTransform: 'uppercase' as const, letterSpacing: '0.05em', borderBottom: '1px solid #1e293b' },
    tr: { borderBottom: '1px solid #1e293b' },
    td: { padding: '0.9rem 1rem', color: '#cbd5e1' },
    symbolCell: { fontWeight: 700, color: '#f1f5f9', letterSpacing: '0.04em' },
    badge: { display: 'inline-block', padding: '2px 10px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em' },
    tradeCard: { background: '#111827', border: '1px solid #1e293b', borderRadius: '16px', padding: '2rem', maxWidth: '480px' },
    tradeTitle: { margin: '0 0 0.25rem', fontSize: '1.3rem', fontWeight: 700, color: '#f1f5f9' },
    tradeSubtitle: { margin: '0 0 1.5rem', color: '#64748b', fontSize: '0.9rem' },
    tradeMsg: { border: '1px solid', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1.25rem', fontSize: '0.9rem' },
    fieldGroup: { marginBottom: '1.25rem' },
    label: { display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' },
    input: { width: '100%', background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', padding: '0.7rem 1rem', color: '#f1f5f9', fontSize: '1rem', outline: 'none', boxSizing: 'border-box' as const },
    tradeButtons: { display: 'flex', gap: '0.75rem', marginTop: '1.5rem' },
    tradeBtn: { flex: 1, padding: '0.75rem', border: 'none', borderRadius: '10px', fontSize: '1rem', fontWeight: 700, cursor: 'pointer', transition: 'opacity 0.15s' },
    buyBtn: { background: '#064e3b', color: '#34d399' },
    sellBtn: { background: '#450a0a', color: '#f87171' },
    empty: { textAlign: 'center', padding: '4rem 2rem', color: '#475569' },
    emptyIcon: { fontSize: '2.5rem' },
    emptyText: { marginTop: '0.75rem', fontSize: '0.95rem' },
    dropdown: { position: 'absolute', top: '100%', left: 0, right: 0, background: '#111827', border: '1px solid #1e293b', borderRadius: '8px', zIndex: 50, marginTop: '4px', overflow: 'hidden' },
    dropdownItem: { padding: '0.65rem 1rem', cursor: 'pointer', borderBottom: '1px solid #1e293b', transition: 'background 0.1s' },
    detailCard: { background: '#111827', border: '1px solid #1e293b', borderRadius: '16px', padding: '1.5rem' },
    stockHeader: { display: 'flex', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' },
    overviewGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.5rem' },
    fundRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.75rem', background: '#0f172a', borderRadius: '8px' },
    fundLabel: { color: '#64748b', fontSize: '0.85rem' },
    fundValue: { color: '#f1f5f9', fontWeight: 600, fontSize: '0.9rem' },
    signalLayout: { display: 'grid', gridTemplateColumns: 'minmax(300px, 0.95fr) minmax(320px, 1.05fr)', gap: '1.25rem', alignItems: 'start' },
    signalPanel: { background: '#111827', border: '1px solid #1e293b', borderRadius: '16px', padding: '1.5rem' },
    signalGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem' },
    signalList: { display: 'flex', flexDirection: 'column', gap: '0.65rem' },
    signalItem: { display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', background: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '0.8rem 0.9rem' },
    signalMeta: { color: '#64748b', fontSize: '0.82rem', marginTop: '0.25rem', lineHeight: 1.5 },
    iconBtn: { background: '#1e293b', border: '1px solid #334155', color: '#94a3b8', borderRadius: '8px', padding: '0.45rem 0.7rem', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 },
    learningBox: { marginTop: '1.5rem', background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '1rem' },
    learningMeta: { color: '#64748b', fontSize: '0.82rem', margin: '0.75rem 0 0' },
    recommendationList: { display: 'flex', flexDirection: 'column', gap: '0.8rem' },
    recommendationCard: { background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '1rem' },
    recommendationHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' },
    confidenceBadge: { background: '#064e3b', color: '#34d399', border: '1px solid rgba(52,211,153,0.25)', borderRadius: '999px', padding: '0.2rem 0.65rem', fontSize: '0.78rem', fontWeight: 800 },
    analysisCopy: { color: '#cbd5e1', fontSize: '0.88rem', lineHeight: 1.65, margin: '0.75rem 0 0' },
};
