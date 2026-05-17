const StockSnapshot =
  require('../models/StockSnapshot');

const {
  detectPatterns,
} = require('./patternDetectionService');

const {
  isValidStock,
} = require('./stockFilterService');

function todayDateString() {
  return new Date()
    .toISOString()
    .split('T')[0];
}

async function saveSnapshot(stockData) {

  // Reject junk stocks
  if (!isValidStock(stockData)) {
    return null;
  }

  const patterns =
    detectPatterns(stockData);

  // Ignore meaningless stocks
  if (!patterns.length) {
    return null;
  }

  const date =
    stockData.date ||
    todayDateString();

  return StockSnapshot.findOneAndUpdate(
    {
      symbol: stockData.symbol,
      date,
    },
    {
      $set: {
        symbol: stockData.symbol,
        date,
        price: stockData.price,
        volume: stockData.volume,
        rsi: stockData.rsi,
        patterns,
      },
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }
  );
}

module.exports = {
  saveSnapshot,
};