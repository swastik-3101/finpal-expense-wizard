const StockSnapshot = require('../models/StockSnapshot');
const PatternStats = require('../models/PatternStats');
const { getPatternKey } = require('./patternDetectionService');

function dateStringDaysAgo(daysAgo) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split('T')[0];
}

async function updatePatternPerformance(fetchTodayPrice, options = {}) {
  const dateStr = options.date || dateStringDaysAgo(1);
  const snapshots = await StockSnapshot.find({ date: dateStr });
  const results = {
    date: dateStr,
    evaluated: 0,
    skipped: 0,
    updated: 0,
    errors: [],
  };

  for (const snap of snapshots) {
    try {
      if (!snap.price || snap.price <= 0) {
        results.skipped += 1;
        continue;
      }

      const todayPrice = await fetchTodayPrice(snap.symbol);
      if (!Number.isFinite(todayPrice)) {
        results.skipped += 1;
        continue;
      }

      const change = (todayPrice - snap.price) / snap.price;
      const success = change >= 0.02;
      const patternKey = getPatternKey(snap.patterns);

      const stats = await PatternStats.findOneAndUpdate(
        { patternKey },
        {
          $inc: success ? { successCount: 1 } : { failCount: 1 },
          $set: { lastUpdated: new Date().toISOString() },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );

      const total = stats.successCount + stats.failCount;
      stats.confidence = total > 0 ? stats.successCount / total : 0;
      await stats.save();

      results.evaluated += 1;
      results.updated += 1;
    } catch (error) {
      results.errors.push({ symbol: snap.symbol, message: error.message });
    }
  }

  return results;
}

module.exports = { updatePatternPerformance };
