const axios = require('axios');
const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: "yourapikeyhere"});

const FINNHUB_KEY = 'yourapikeyhere';
const ALPHA_KEY = 'yourapikeyhere';

// ── cache movers (same as marketController) ──────────────────────────────────
const TTL = 60 * 1000;
const cache = new Map();

function cacheGet(key) {
    const entry = cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > TTL) { cache.delete(key); return null; }
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

async function getDashboardData() {
    const url = `https://www.alphavantage.co/query?function=TOP_GAINERS_LOSERS&apikey=${ALPHA_KEY}`;
    return await httpGet(url);
}

// ── GET /api/insights/stock-data ─────────────────────────────────────────────
exports.getStockData = async (req, res) => {
    try {
        const data = await getDashboardData();
        res.json({
            gainers: data.top_gainers || [],
            losers: data.top_losers || [],
            active: data.most_actively_traded || [],
            lastUpdated: data.last_updated || null,
        });
    } catch (err) {
        console.error('getStockData error:', err.message);
        res.status(500).json({ msg: 'Failed to fetch market data' });
    }
};

// ── POST /api/insights/analyze (streaming) ───────────────────────────────────
exports.analyzeStocks = async (req, res) => {
    try {
        const data = await getDashboardData();

        const gainers = (data.top_gainers || []).slice(0, 10);
        const losers = (data.top_losers || []).slice(0, 10);
        const active = (data.most_actively_traded || []).slice(0, 10);

        const formatList = (list) =>
            list.map(s =>
                `  • ${s.ticker}: $${s.price} (${s.change_percentage}, vol: ${parseInt(s.volume).toLocaleString()})`
            ).join('\n');

        const prompt = `You are a stock market analyst. Based on today's real market data below, recommend the TOP 3 stocks to consider investing in. Be specific, concise, and explain your reasoning using the data provided.

## TODAY'S MARKET DATA

### Top Gainers
${formatList(gainers)}

### Top Losers
${formatList(losers)}

### Most Actively Traded
${formatList(active)}

## YOUR TASK
1. Identify the TOP 3 stocks worth considering from this data
2. For each pick, explain WHY using specific numbers (price, % change, volume)
3. Note any risks
4. Give an overall market sentiment summary in 1-2 sentences

Be direct. No generic disclaimers. Use the actual data.`;

        // Set up SSE headers for streaming
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();

        const stream = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 1024,
            temperature: 0.7,
            stream: true,
        });

        for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content || '';
            if (delta) {
                res.write(`data: ${JSON.stringify({ text: delta })}\n\n`);
            }
        }

        res.write('data: [DONE]\n\n');
        res.end();

    } catch (err) {
        console.error('analyzeStocks error:', err.message);
        if (!res.headersSent) {
            res.status(500).json({ msg: 'Analysis failed' });
        } else {
            res.write(`data: ${JSON.stringify({ error: 'Analysis failed' })}\n\n`);
            res.end();
        }
    }
};
