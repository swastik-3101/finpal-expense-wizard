const axios = require('axios');

const {
  saveSnapshot,
} = require('./snapshotService');

const {
  fetchRSI,
} = require('./technicalIndicatorService');

const {
  isValidStock,
} = require('./stockFilterService');

async function fetchMarketMovers() {

  const apiKey =
    process.env.ALPHA_VANTAGE_KEY;

  const url =
    `https://www.alphavantage.co/query?function=TOP_GAINERS_LOSERS&apikey=${apiKey}`;

  const { data } = await axios.get(url);

  return [
    ...(data.top_gainers || []),
    ...(data.top_losers || []),
    ...(data.most_actively_traded || []),
  ];
}

async function buildDailySnapshots() {

  const stocks =
    await fetchMarketMovers();

  const savedSnapshots = [];

  for (const stock of stocks) {

    try {

      const stockData = {
  symbol: stock.ticker,

  price: Number(stock.price),

  volume: Number(stock.volume),

  avgVolume:
    Number(stock.avg_volume || stock.volume),

  priceChange: Number(
    String(
      stock.change_percentage || '0'
    ).replace('%', '')
  ),
};

      // Filter junk
      if (!isValidStock(stockData)) {
        continue;
      }

      // Fetch RSI
      const rsi =
        await fetchRSI(stockData.symbol);

      if (!Number.isFinite(rsi)) {
        continue;
      }

      // Save snapshot
      const snapshot =
        await saveSnapshot({
          ...stockData,
          rsi,
        });

      if (snapshot) {
        savedSnapshots.push(snapshot);
      }

    } catch (error) {

      console.error(
        'Snapshot pipeline failed:',
        error.message
      );
    }
  }

  return savedSnapshots;
}

module.exports = {
  buildDailySnapshots,
};