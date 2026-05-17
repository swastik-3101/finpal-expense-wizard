const express = require('express');
const router = express.Router();
const {
  createSnapshot,
  getRecommendations,
  runLearning,
} = require('../controllers/stockController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.post('/snapshot', createSnapshot);
router.post('/recommend', getRecommendations);
router.post('/learn', runLearning);

module.exports = router;
