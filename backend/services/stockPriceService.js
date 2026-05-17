const axios = require('axios');

async function fetchCurrentPrice(symbol) {
  const fallbackPrice = Number(process.env.STOCK_LEARNING_PRICE_FALLBACK);
  if (Number.isFinite(fallbackPrice) && fallbackPrice > 0) {
    return fallbackPrice;
  }

  const apiKey = process.env.FINNHUB_KEY || process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    throw new Error('FINNHUB_KEY or STOCK_LEARNING_PRICE_FALLBACK is required');
  }

  const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`;
  const { data } = await axios.get(url);
  const current = Number(data.c);

  if (!Number.isFinite(current) || current <= 0) {
    throw new Error(`Current price unavailable for ${symbol}`);
  }

  return current;
}

module.exports = { fetchCurrentPrice };
