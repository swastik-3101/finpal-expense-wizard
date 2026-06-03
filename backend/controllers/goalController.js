const Goal = require('../models/Goal');
const User = require('../models/User');

// GET /api/goals
exports.getGoals = async (req, res) => {
    try {
        const goals = await Goal.find({ user: req.user.id }).sort({ createdAt: -1 });
        res.json(goals);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// POST /api/goals
exports.createGoal = async (req, res) => {
    try {
        const { title, description, targetAmount, currentAmount, startDate, targetDate, category, status } = req.body;

        const goal = new Goal({
            user: req.user.id,
            title,
            description,
            targetAmount,
            currentAmount: currentAmount || 0,
            startDate,
            targetDate,
            category,
            status: status || 'in-progress'
        });

        goal.updateProgress();
        await goal.save();
        res.json(goal);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// PUT /api/goals/contribute
exports.addContribution = async (req, res) => {
    try {
        const { goalId, amount } = req.body;

        const goal = await Goal.findById(goalId);
        if (!goal) return res.status(404).json({ msg: 'Goal not found' });
        if (goal.user.toString() !== req.user.id) return res.status(401).json({ msg: 'Not authorized' });
        if (!amount || amount <= 0) return res.status(400).json({ msg: 'Valid amount required' });

        // Update goal progress
        goal.currentAmount += amount;
        goal.updateProgress();
        if (goal.currentAmount >= goal.targetAmount) goal.status = 'completed';
        goal.updatedAt = new Date();
        await goal.save();

        // Update user's monthly goal contributions — reset if new month
        const user = await User.findById(req.user.id);
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        if (
            user.monthlyGoalContributionsMonth !== currentMonth ||
            user.monthlyGoalContributionsYear !== currentYear
        ) {
            user.monthlyGoalContributions = 0;
            user.monthlyGoalContributionsMonth = currentMonth;
            user.monthlyGoalContributionsYear = currentYear;
        }

        user.monthlyGoalContributions += amount;
        await user.save();

        res.json(goal);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// PUT /api/goals/status
exports.updateGoalStatus = async (req, res) => {
    try {
        const { goalId, status } = req.body;

        const goal = await Goal.findById(goalId);
        if (!goal) return res.status(404).json({ msg: 'Goal not found' });
        if (goal.user.toString() !== req.user.id) return res.status(401).json({ msg: 'Not authorized' });

        goal.status = status;
        goal.updatedAt = new Date();
        await goal.save();

        res.json(goal);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// DELETE /api/goals?goalId=xxx
exports.deleteGoal = async (req, res) => {
    try {
        const { goalId } = req.query;

        const goal = await Goal.findById(goalId);
        if (!goal) return res.status(404).json({ msg: 'Goal not found' });
        if (goal.user.toString() !== req.user.id) return res.status(401).json({ msg: 'Not authorized' });

        await Goal.findByIdAndRemove(goalId);
        res.json({ msg: 'Goal deleted' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};