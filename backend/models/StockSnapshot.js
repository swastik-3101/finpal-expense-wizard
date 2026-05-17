const mongoose = require('mongoose');

const stockSnapshotSchema = new mongoose.Schema(
  {
    symbol: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    date: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    volume: {
      type: Number,
      required: true,
      min: 0,
    },
    rsi: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    patterns: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

stockSnapshotSchema.index({ date: 1, symbol: 1 });

module.exports = mongoose.model('StockSnapshot', stockSnapshotSchema);
