const axios = require('axios');
const Groq = require('groq-sdk');
const Expense = require('../models/Expense');
const StockSnapshot = require('../models/StockSnapshot');
const { saveSnapshot } = require('../services/snapshotService');
const { recommendStocks } = require('../services/recommendationService');

const getGroq = () => {
    const apiKey = process.env.GROQ_API_KEY || process.env.GROQ_API_KEY_STOCKS;
    return apiKey ? new Groq({ apiKey }) : null;
};

const FINNHUB_KEY = process.env.FINNHUB_KEY;
const ALPHA_KEY = process.env.ALPHA_VANTAGE_KEY;

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

function parsePercent(value) {
    const n = parseFloat(String(value || '').replace('%', ''));
    return Number.isFinite(n) ? n : 0;
}

function moverToSnapshot(mover) {
    return {
        symbol: String(mover.ticker || '').toUpperCase(),
        price: Number(mover.price) || 0,
        volume: Number(mover.volume) || 0,
        priceChange: parsePercent(mover.change_percentage),
        rsi: 50,
    };
}

async function attachPreviousSnapshots(snapshots) {
    const today = new Date().toISOString().split('T')[0];

    return Promise.all(snapshots.map(async (snapshot) => {
        const previous = await StockSnapshot.findOne({
            symbol: snapshot.symbol,
            date: { $ne: today },
        }).sort({ date: -1 });

        if (!previous) return snapshot;

        const previousPrice = Number(previous.price);
        const currentPrice = Number(snapshot.price);
        const changeFromPreviousSnapshot =
            previousPrice > 0 ? ((currentPrice - previousPrice) / previousPrice) * 100 : null;

        return {
            ...snapshot,
            previousSnapshotDate: previous.date,
            previousSnapshotPrice: previousPrice,
            changeFromPreviousSnapshot,
        };
    }));
}

function uniqueMoverSnapshots(movers) {
    const seen = new Set();
    return movers
        .map(moverToSnapshot)
        .filter((snapshot) => {
            if (
                !snapshot.symbol ||
                !snapshot.price ||
                !snapshot.volume ||
                seen.has(snapshot.symbol) ||
                !/^[A-Z]{1,5}$/.test(snapshot.symbol) ||
                /[WRU]$/.test(snapshot.symbol) ||
                snapshot.price < 5
            ) return false;
            seen.add(snapshot.symbol);
            return true;
        });
}

async function getExpenseSummary(userId) {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);

    const expenses = await Expense.find({
        user: userId,
        date: { $gte: thirtyDaysAgo.toISOString() },
    });

    const total = expenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
    const categoryTotals = expenses.reduce((acc, exp) => {
        acc[exp.category] = (acc[exp.category] || 0) + Number(exp.amount || 0);
        return acc;
    }, {});

    const topCategories = Object.entries(categoryTotals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([category, amount]) => ({ category, amount }));

    return {
        total,
        averagePerDay: total / 30,
        count: expenses.length,
        topCategories,
    };
}

function chooseRecommendations(
  recommendations,
  availableBalance
) {

  const minBudget =
    availableBalance * 0.05;

  const maxBudget =
    availableBalance * 0.15;

  // Only quality picks
  const filtered =
    recommendations.filter((rec) => {

      const totalSamples =
        (rec.successCount || 0) +
        (rec.failCount || 0);

      return (
        rec.confidence >= 0.6 &&
        totalSamples >= 5 &&
        rec.price > 0
      );
    });

  // Shuffle randomly
  const shuffled =
    [...filtered].sort(
      () => Math.random() - 0.5
    );

  const selected = [];

  let totalCost = 0;

  for (const rec of shuffled) {

    const quantity =
      Math.max(
        1,
        Math.floor(minBudget / rec.price)
      );

    const estimatedCost =
      quantity * rec.price;

    // Stop if exceeding safe exposure
    if (
      totalCost + estimatedCost >
      maxBudget
    ) {
      continue;
    }

    selected.push({
      ...rec,
      suggestedQuantity: quantity,
      estimatedCost,
    });

    totalCost += estimatedCost;

    // Max 2 stocks
    if (selected.length >= 2) {
      break;
    }
  }

  return selected;
}

function buildFallbackPersonalizedResponse({ availableBalance, expenseSummary, pick }) {
    if (!availableBalance || availableBalance <= 0) {
        return 'I could not find your available balance in the database yet, so I cannot size a stock purchase safely. Add or update your balance first, then I can recommend a small 5-10% investment amount.';
    }

    if (!pick) {
        return `You have $${availableBalance.toFixed(2)} available and spent $${expenseSummary.total.toFixed(2)} in the last 30 days. I would not force a stock buy today because none of the clean stock candidates fit inside a safe 5-10% budget. Keep cash ready and wait for a clearer affordable signal.`;
    }

    const maxBudget = availableBalance * 0.075;
    const quantity = Math.max(1, Math.floor(maxBudget / pick.price));
    const estimatedCost = quantity * pick.price;
    const confidenceText = pick.confidence ? `${Math.round(pick.confidence * 100)}% learned confidence` : 'market-momentum signal';
    const previousText = pick.previousSnapshotPrice
        ? ` In the previous saved snapshot on ${pick.previousSnapshotDate}, it was $${pick.previousSnapshotPrice.toFixed(2)}; now it is about $${pick.price.toFixed(2)} (${pick.changeFromPreviousSnapshot >= 0 ? '+' : ''}${pick.changeFromPreviousSnapshot.toFixed(1)}%).`
        : ` I do not have an older saved snapshot for ${pick.symbol} yet, so this is based on today's snapshot only.`;

    return `You have $${availableBalance.toFixed(2)} available and spent $${expenseSummary.total.toFixed(2)} in the last 30 days, so do not invest the whole balance. A simple plan is ${pick.symbol}: buy ${quantity} share${quantity > 1 ? 's' : ''} at about $${pick.price.toFixed(2)} each, costing around $${estimatedCost.toFixed(2)}. That is only ${((estimatedCost / availableBalance) * 100).toFixed(1)}% of your balance.${previousText} This was picked from the ${pick.pattern} signal with ${confidenceText}.`;
}

exports.getPersonalizedStockAnalysis = async (req, res) => {
    try {
        if (req.user.availableBalance == null) {
            req.user.availableBalance = 2450.75;
            await req.user.save();
        }

        const availableBalance = Number(req.user.availableBalance || req.user.balance || req.user.currentBalance || 0);
        const data = await getDashboardData();
        const { detectPatterns } =
    require('../services/patternDetectionService');

    const rawSnapshots =
    await attachPreviousSnapshots(
        uniqueMoverSnapshots([
            ...(data.top_gainers || []).slice(0, 10),
            ...(data.most_actively_traded || []).slice(0, 10),
            ...(data.top_losers || []).slice(0, 5),
        ])
    );

const snapshots =
    rawSnapshots.map((snapshot) => ({
        ...snapshot,
        patterns: detectPatterns(snapshot),
    }));

console.log('Snapshots with patterns:', snapshots);

        await Promise.allSettled(snapshots.map((snapshot) => saveSnapshot(snapshot)));

        const expenseSummary = await getExpenseSummary(req.user.id);
        const recommendations =
  await recommendStocks(
    snapshots,
    {
      confidenceThreshold: 0.6,
    }
  );

const picks =
  chooseRecommendations(
    recommendations,
    availableBalance
  );

const pick =
  picks[0] || null;
        const fallback =
  buildFallbackPersonalizedResponse({
    availableBalance,
    expenseSummary,
    pick,
  });

// IMPORTANT:
// If no learned recommendation exists,
// DO NOT call AI.
if (!pick) {

    return res.json({
        response: fallback,
        availableBalance,
        expenseSummary,
        recommendations: [],
        primaryRecommendation: null,
        source: 'fallback',
    });
}

const groq = getGroq();

if (!groq) {

    return res.json({
    response: fallback,

    availableBalance,

    expenseSummary,

    recommendations: picks,

    primaryRecommendation: pick,

    source: 'fallback',
});
}
const enrichedPicks =
  picks.map((pick) => {

    const budgetPerStock =
      availableBalance * 0.05;

    const quantity =
      Math.max(
        1,
        Math.floor(
          budgetPerStock / pick.price
        )
      );

    return {
      ...pick,
      suggestedQuantity: quantity,
      estimatedCost:
        quantity * pick.price,
    };
});

        const prompt = `
You are FinPal, a friendly AI finance assistant.

Use ONLY the provided JSON data.

Speak naturally like a modern finance app.

IMPORTANT:
- Only discuss the recommendations already provided.
- Do NOT invent extra stocks.
- Do NOT force exactly 3 recommendations.
- Never mention missing recommendations.
- Keep the tone conversational, short, and practical.
- Use beginner-friendly wording.
- Mention:
  - stock symbol
  - estimated cost
  - suggested quantity
  - simple risk
  - whether the signal came from:
    - learned historical confidence
    - or today's momentum
- Keep investment suggestions conservative.
- Never suggest using more than 15% total balance.
- Avoid repeating balance and expense values too many times.
- Do not sound like a financial report.

Return ONLY a plain chat response.

DATA:
${JSON.stringify({
  availableBalance,
  expenseSummary,
  recommendations: enrichedPicks,
}, null, 2)}
`;

        const completion = await groq.chat.completions.create({
            model: process.env.STOCK_ANALYSIS_MODEL || 'llama-3.1-8b-instant',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 450,
            temperature: 0.25,
        });

        res.json({
    response:
      completion.choices?.[0]?.message?.content || fallback,

    availableBalance,

    expenseSummary,

    recommendations: picks,

    primaryRecommendation: pick,

    source: 'ai',
});
    } catch (err) {
        console.error('getPersonalizedStockAnalysis error:', err.message);
        res.json({
            response: 'I could not complete the live AI analysis right now, but your snapshots are still being handled in the background. Try again after checking your market API and Groq key.',
            source: 'fallback',
        });
    }
};

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

        const groq = getGroq();
        if (!groq) throw new Error('GROQ_API_KEY is not configured');

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
