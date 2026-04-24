const axios = require('axios');

const FINNHUB_KEY = 'yourapikeyhere';
const FMP_KEY = 'yourapikeyhere';
const ALPHA_KEY = 'yourapikeyhere';
const TWELVE_KEY = 'yourapikeyhere';

// -------------------------------------------------------
// Simple in-memory cache (mirrors SimpleCache.java)
// -------------------------------------------------------
const TTL = (parseInt(process.env.MARKET_CACHE_TTL_SECONDS) || 60) * 1000;
const cache = new Map();

function cacheGet(key) {
    const entry = cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > TTL) {
        cache.delete(key);
        return null;
    }
    return entry.data;
}

function cacheSet(key, data) {
    cache.set(key, { data, timestamp: Date.now() });
}

async function httpGet(url) {
    const cached = cacheGet(url);
    if (cached) return cached;
    const { data } = await axios.get(url);
    cacheSet(url, data);
    return data;
}

function safeDouble(val) {
    if (val == null) return null;
    const n = parseFloat(val);
    return isFinite(n) ? n : null;
}

// -------------------------------------------------------
// 1. SYMBOL SEARCH (Finnhub)
// GET /api/market/search?q=AAPL
// -------------------------------------------------------
exports.searchSymbols = async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) return res.status(400).json({ msg: 'Query parameter q is required' });

        const url = `https://finnhub.io/api/v1/search?q=${q}&token=${FINNHUB_KEY}`;
        const data = await httpGet(url);

        if (!data.result) return res.json([]);

        const results = data.result
            .slice(0, 10)
            .map(item => ({ symbol: item.symbol, name: item.description }));

        res.json(results);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Symbol search failed' });
    }
};

// -------------------------------------------------------
// 2. STOCK PROFILE (FMP)
// GET /api/market/profile/:symbol
// -------------------------------------------------------
exports.getStockProfile = async (req, res) => {
    try {
        const { symbol } = req.params;
        const url = `https://financialmodelingprep.com/stable/profile?symbol=${symbol}&apikey=${FMP_KEY}`;
        const data = await axios.get(url);

        if (!data.data || data.data.length === 0) {
            return res.status(404).json({ msg: 'Invalid symbol or profile not available' });
        }

        res.json(data.data[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Profile not available' });
    }
};

// -------------------------------------------------------
// 3. FUNDAMENTALS (FMP + Finnhub)
// GET /api/market/fundamentals/:symbol
// -------------------------------------------------------
exports.getFundamentals = async (req, res) => {
    try {
        const { symbol } = req.params;

        // FMP quote — price, 52W high/low, market cap
        const quoteUrl = `https://financialmodelingprep.com/stable/quote?symbol=${symbol}&apikey=${FMP_KEY}`;
        const quoteData = await axios.get(quoteUrl);
        const q = quoteData.data?.[0] || {};

        // Finnhub metrics — PE, EPS, ROE, ROA, Beta, FCF
        const metricUrl = `https://finnhub.io/api/v1/stock/metric?symbol=${symbol}&metric=all&token=${FINNHUB_KEY}`;
        const metricData = await httpGet(metricUrl);
        const m = metricData?.metric || {};

        res.json({
            price: safeDouble(q.price),
            marketCap: safeDouble(q.marketCap),
            high52: safeDouble(q.yearHigh),
            low52: safeDouble(q.yearLow),
            eps: safeDouble(m.epsInclExtraItemsTTM),
            peRatio: safeDouble(m.peTTM),
            beta: safeDouble(m.beta),
            roe: safeDouble(m.roeTTM),
            roa: safeDouble(m.roaTTM),
            freeCashFlow: safeDouble(m.freeCashFlowTTM),
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Fundamentals not available' });
    }
};

// -------------------------------------------------------
// 4. LIVE PRICE (Finnhub)
// GET /api/market/price/:symbol
// -------------------------------------------------------
exports.getCurrentPrice = async (req, res) => {
    try {
        const { symbol } = req.params;
        const url = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_KEY}`;
        const data = await httpGet(url);

        res.json({
            current: safeDouble(data.c),
            open: safeDouble(data.o),
            high: safeDouble(data.h),
            low: safeDouble(data.l),
            prevClose: safeDouble(data.pc),
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Price not available' });
    }
};

// -------------------------------------------------------
// Helper: fetch movers from Alpha Vantage (cached)
// -------------------------------------------------------
async function getMovers() {
    const url = `https://www.alphavantage.co/query?function=TOP_GAINERS_LOSERS&apikey=${ALPHA_KEY}`;
    return await httpGet(url);
}

// -------------------------------------------------------
// 5. TOP GAINERS (Alpha Vantage)
// GET /api/market/gainers
// -------------------------------------------------------
exports.getTopGainers = async (req, res) => {
    try {
        const data = await getMovers();
        res.json({ gainers: data.top_gainers || [] });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ gainers: [] });
    }
};

// -------------------------------------------------------
// 6. TOP LOSERS (Alpha Vantage)
// GET /api/market/losers
// -------------------------------------------------------
exports.getTopLosers = async (req, res) => {
    try {
        const data = await getMovers();
        res.json({ losers: data.top_losers || [] });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ losers: [] });
    }
};

// -------------------------------------------------------
// 7. MOST ACTIVE (Alpha Vantage)
// GET /api/market/active
// -------------------------------------------------------
exports.getMostActive = async (req, res) => {
    try {
        const data = await getMovers();
        res.json({ active: data.most_actively_traded || [] });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ active: [] });
    }
};

// -------------------------------------------------------
// 8. DASHBOARD — gainers + losers + active in one call
// GET /api/market/dashboard
// -------------------------------------------------------
exports.getDashboard = async (req, res) => {
    try {
        const data = await getMovers(); // single API call, cached
        res.json({
            gainers: data.top_gainers || [],
            losers: data.top_losers || [],
            active: data.most_actively_traded || [],
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ gainers: [], losers: [], active: [] });
    }
};

// -------------------------------------------------------
// 9. CANDLE DATA (Twelve Data)
// GET /api/market/candles/:symbol
// -------------------------------------------------------
exports.getStockCandles = async (req, res) => {
    try {
        const { symbol } = req.params;
        const url = `https://api.twelvedata.com/time_series?symbol=${symbol}&interval=1day&outputsize=30&apikey=${TWELVE_KEY}`;
        const { data } = await axios.get(url);

        if (data.status === 'error') {
            return res.status(404).json({ msg: data.message || 'No candle data available' });
        }

        if (!data.values) {
            return res.status(404).json({ msg: 'No candle data available' });
        }

        const candles = data.values.map(item => ({
            datetime: item.datetime,
            open: parseFloat(item.open),
            high: parseFloat(item.high),
            low: parseFloat(item.low),
            close: parseFloat(item.close),
        }));

        res.json({ candles });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Candles not available' });
    }
};