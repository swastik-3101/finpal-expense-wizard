const cron = require('node-cron');
const { updatePatternPerformance } = require('../services/learningService');
const { fetchCurrentPrice } = require('../services/stockPriceService');
const {
  buildDailySnapshots,
} = require('../services/marketSnapshotPipelineService');

function startDailyLearningJob() {
  if (process.env.DISABLE_STOCK_LEARNING_CRON === 'true') {
    return null;
  }

  const schedule = process.env.STOCK_LEARNING_CRON || '0 18 * * *';
  const timezone = process.env.STOCK_LEARNING_TIMEZONE || 'Asia/Kolkata';

  return cron.schedule(
    schedule,
    async () => {
      console.log('Running daily stock pattern learning...');

      try {
        await buildDailySnapshots();
        const results = await updatePatternPerformance(fetchCurrentPrice);
        console.log('Daily stock pattern learning complete:', results);
      } catch (error) {
        console.error('Daily stock pattern learning failed:', error.message);
      }
    },
    { timezone }
  );
}

module.exports = { startDailyLearningJob };
