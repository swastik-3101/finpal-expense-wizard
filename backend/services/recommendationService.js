const PatternStats = require('../models/PatternStats');
const { getPatternKey } = require('./patternDetectionService');

async function recommendStocks(snapshots, options = {}) {
  const confidenceThreshold = options.confidenceThreshold || 0.6;
  const recommendations = [];

  for (const snap of snapshots) {
    const patternKey = getPatternKey(snap.patterns);
    const stats = await PatternStats.findOne({ patternKey });

    if (stats && stats.confidence > confidenceThreshold) {
      recommendations.push({
        symbol: snap.symbol,
        confidence: stats.confidence,
        pattern: patternKey,
        patterns: snap.patterns || [],
        price: snap.price,
        volume: snap.volume,
        rsi: snap.rsi,
        previousSnapshotDate: snap.previousSnapshotDate,
        previousSnapshotPrice: snap.previousSnapshotPrice,
        changeFromPreviousSnapshot: snap.changeFromPreviousSnapshot,
        successCount: stats.successCount,
        failCount: stats.failCount,
      });
    }
  }

  return recommendations;
}

module.exports = { recommendStocks };
