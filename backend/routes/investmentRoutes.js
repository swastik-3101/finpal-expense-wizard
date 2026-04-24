const express = require('express');
const router = express.Router();
const {
  buyStock,
  sellStock,
  getPortfolio,
  getPortfolioSummary,
  getAllInvestments,
  getTransactions,
} = require('../controllers/investmentController');
const authMiddleware = require('../middleware/auth'); // your existing JWT middleware

router.use(authMiddleware); // protect all investment routes

router.post('/buy', buyStock);
router.post('/sell', sellStock);
router.get('/portfolio/summary', getPortfolioSummary);
router.get('/portfolio', getPortfolio);
router.get('/transactions', getTransactions);
router.get('/', getAllInvestments);

module.exports = router;