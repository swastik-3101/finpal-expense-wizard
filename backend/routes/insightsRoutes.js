const express = require('express');
const router = express.Router();
const { getStockData, analyzeStocks } = require('../controllers/insightsController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.get('/stock-data', getStockData);
router.post('/analyze', analyzeStocks);

module.exports = router;
