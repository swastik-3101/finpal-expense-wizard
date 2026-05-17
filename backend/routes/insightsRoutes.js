const express = require('express');
const router = express.Router();
const {
  getStockData,
  analyzeStocks,
  getPersonalizedStockAnalysis,
} = require('../controllers/insightsController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.get('/stock-data', getStockData);
router.post('/analyze', analyzeStocks);
router.post('/personalized-stock-analysis', getPersonalizedStockAnalysis);

module.exports = router;
