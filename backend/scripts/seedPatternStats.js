require('dotenv').config();

const mongoose = require('mongoose');

const PatternStats =
  require('../models/PatternStats');

async function seed() {

  await mongoose.connect(
    process.env.MONGO_URI
  );

  const patterns = [

    {
      patternKey:
        'HIGH_VOLUME+RSI_OVERSOLD',

      successCount: 14,
      failCount: 5,
    },

    {
      patternKey:
        'SPIKE',

      successCount: 9,
      failCount: 6,
    },

    {
      patternKey:
        'MOMENTUM_BULLISH',

      successCount: 18,
      failCount: 7,
    },

    {
      patternKey:
        'HIGH_VOLUME',

      successCount: 11,
      failCount: 8,
    },
    {
  patternKey: 'MOMENTUM_BREAKOUT',
  successCount: 16,
  failCount: 4,
},

{
  patternKey: 'RSI_RECOVERY',
  successCount: 10,
  failCount: 5,
},

{
  patternKey: 'STEADY_STRENGTH',
  successCount: 15,
  failCount: 6,
},
{
  patternKey:
    'MOMENTUM_BREAKOUT+SPIKE',

  successCount: 20,
  failCount: 6,
},
  ];

  for (const item of patterns) {

    const total =
      item.successCount +
      item.failCount;

    const confidence =
      item.successCount / total;

    await PatternStats.findOneAndUpdate(
      {
        patternKey: item.patternKey,
      },
      {
        $set: {
          ...item,
          confidence,
          lastUpdated:
            new Date().toISOString(),
        },
      },
      {
        upsert: true,
      }
    );
  }

  console.log(
    'Pattern stats seeded successfully'
  );

  process.exit(0);
}

seed();