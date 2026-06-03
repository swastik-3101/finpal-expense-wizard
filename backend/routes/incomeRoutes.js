const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getIncome, addIncome, setMonthlyBudget } = require('../controllers/incomeController');

router.use(auth);

router.get('/', getIncome);
router.post('/', addIncome);
router.put('/budget', setMonthlyBudget);

module.exports = router;