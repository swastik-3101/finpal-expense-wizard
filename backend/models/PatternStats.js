const mongoose = require('mongoose');

const patternStatsSchema = new mongoose.Schema(
  {
    patternKey: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    successCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    failCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    confidence: {
      type: Number,
      default: 0,
      min: 0,
      max: 1,
    },
    lastUpdated: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model('PatternStats', patternStatsSchema);
