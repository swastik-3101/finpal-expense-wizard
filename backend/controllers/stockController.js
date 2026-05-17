const { saveSnapshot } = require('../services/snapshotService');
const { recommendStocks } = require('../services/recommendationService');
const { updatePatternPerformance } = require('../services/learningService');
const { fetchCurrentPrice } = require('../services/stockPriceService');
const { addAiAnalysisToRecommendations } = require('../services/stockAnalysisService');

function isNumber(value) {
  return Number.isFinite(Number(value));
}

function validateSnapshotPayload(payload) {
  const requiredFields = ['symbol', 'price', 'volume', 'rsi'];
  const missing = requiredFields.filter((field) => payload[field] === undefined || payload[field] === null);

  if (missing.length > 0) {
    return `Missing required fields: ${missing.join(', ')}`;
  }

  if (!isNumber(payload.price) || !isNumber(payload.volume) || !isNumber(payload.rsi)) {
    return 'price, volume, and rsi must be valid numbers';
  }

  return null;
}

exports.createSnapshot = async (req, res) => {
  try {
    const error = validateSnapshotPayload(req.body);
    if (error) return res.status(400).json({ msg: error });

    const snapshot = await saveSnapshot({
      ...req.body,
      price: Number(req.body.price),
      volume: Number(req.body.volume),
      rsi: Number(req.body.rsi),
      priceChange: req.body.priceChange === undefined ? undefined : Number(req.body.priceChange),
      avgVolume: req.body.avgVolume === undefined ? undefined : Number(req.body.avgVolume),
    });

    res.status(201).json({ msg: 'Snapshot saved', snapshot });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Snapshot save failed' });
  }
};

exports.getRecommendations = async (req, res) => {
  try {
    const { snapshots, confidenceThreshold, includeAnalysis } = req.body;
    if (!Array.isArray(snapshots)) {
      return res.status(400).json({ msg: 'snapshots must be an array' });
    }

    const recommendations = await recommendStocks(snapshots, { confidenceThreshold });

    if (includeAnalysis === false) {
      return res.json({ recommendations, aiAnalysisEnabled: false });
    }

    const analyzed = await addAiAnalysisToRecommendations(recommendations);
    res.json(analyzed);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Recommendation failed' });
  }
};

exports.runLearning = async (req, res) => {
  try {
    const results = await updatePatternPerformance(fetchCurrentPrice, { date: req.body.date });
    res.json(results);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Learning update failed' });
  }
};
