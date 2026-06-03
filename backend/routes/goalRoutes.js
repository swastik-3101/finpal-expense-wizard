const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  getGoals,
  createGoal,
  addContribution,
  updateGoalStatus,
  deleteGoal
} = require('../controllers/goalController');

router.use(auth);

router.get('/', getGoals);
router.post('/', createGoal);
router.put('/contribute', addContribution);
router.put('/status', updateGoalStatus);
router.delete('/', deleteGoal);

module.exports = router;