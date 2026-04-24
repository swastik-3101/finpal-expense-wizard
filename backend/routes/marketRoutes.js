const express = require('express');
const router = express.Router();
const {
    searchSymbols,
    getStockProfile,
    getFundamentals,
    getCurrentPrice,
    getTopGainers,
    getTopLosers,
    getMostActive,
    getDashboard,
    getStockCandles,
} = require('../controllers/marketController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware); // protect all market routes

router.get('/search', searchSymbols);
router.get('/profile/:symbol', getStockProfile);
router.get('/fundamentals/:symbol', getFundamentals);
router.get('/price/:symbol', getCurrentPrice);
router.get('/gainers', getTopGainers);
router.get('/losers', getTopLosers);
router.get('/active', getMostActive);
router.get('/dashboard', getDashboard);
router.get('/candles/:symbol', getStockCandles);

module.exports = router;