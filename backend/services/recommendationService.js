const PatternStats = require('../models/PatternStats');
const { getPatternKey } = require('./patternDetectionService');

async function recommendStocks(snapshots, options = {}) {

  const confidenceThreshold =
    options.confidenceThreshold || 0.6;

  const recommendations = [];

  for (const snap of snapshots) {

    const patternKey =
      getPatternKey(snap.patterns);

    // Skip empty patterns
    if (patternKey === 'NO_PATTERN') {
      continue;
    }

    const stats =
      await PatternStats.findOne({
        patternKey,
      });

    // No learning data yet
    if (!stats) {
      continue;
    }

    // Require minimum learning samples
    const totalSamples =
      stats.successCount +
      stats.failCount;

    if (totalSamples < 1) {
      continue;
    }
    console.log({
  symbol: snap.symbol,
  patterns: snap.patterns,
  patternKey,
});

    // Confidence filtering
    if (
      stats.confidence >= confidenceThreshold
    ) {

      recommendations.push({
        symbol: snap.symbol,
        confidence: stats.confidence,
        pattern: patternKey,
        patterns: snap.patterns || [],
        price: snap.price,
        volume: snap.volume,
        rsi: snap.rsi,
        previousSnapshotDate:
          snap.previousSnapshotDate,
        previousSnapshotPrice:
          snap.previousSnapshotPrice,
        changeFromPreviousSnapshot:
          snap.changeFromPreviousSnapshot,
        successCount: stats.successCount,
        failCount: stats.failCount,
      });
      console.log({
  statsFound: !!stats,
  confidence: stats?.confidence,
});
    }
  }

  // Highest confidence first
  recommendations.sort(
    (a, b) => b.confidence - a.confidence
  );

  return recommendations;
}

module.exports = {
  recommendStocks,
};