const User = require('../models/User');
const Expense = require('../models/Expense');
const InvestmentTransaction = require('../models/InvestmentTransaction');

// -------------------------------------------------------
// Helper: calculate live monthly balance
// -------------------------------------------------------
async function calcMonthlyBalance(userId, user) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Monthly expenses — date stored as String in Expense model so filter in JS
    const allExpenses = await Expense.find({ user: userId });
    const monthlyExpenses = allExpenses
        .filter(e => {
            const d = new Date(e.date);
            return d >= startOfMonth && d <= endOfMonth;
        })
        .reduce((sum, e) => sum + e.amount, 0);

    // Monthly investment transactions — BUY decreases balance, SELL increases it
    const monthlyInvestments = await InvestmentTransaction.aggregate([
        {
            $match: {
                userId: userId.toString(),
                createdAt: { $gte: startOfMonth, $lte: endOfMonth }
            }
        },
        {
            $group: {
                _id: '$type',
                total: { $sum: { $multiply: ['$quantity', '$price'] } }
            }
        }
    ]);

    const buyTotal = monthlyInvestments.find(r => r._id === 'BUY')?.total || 0;
    const sellTotal = monthlyInvestments.find(r => r._id === 'SELL')?.total || 0;
    const netInvestmentCost = buyTotal - sellTotal;

    // Monthly goal contributions — check if still current month
    let monthlyGoalContributions = 0;
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    if (
        user.monthlyGoalContributionsMonth === currentMonth &&
        user.monthlyGoalContributionsYear === currentYear
    ) {
        monthlyGoalContributions = user.monthlyGoalContributions || 0;
    }
    // if different month, contributions = 0 (resets on next contribution)

    const balance = user.totalIncome - monthlyExpenses - netInvestmentCost - monthlyGoalContributions;

    return {
        balance,
        monthlyExpenses,
        monthlyInvestedAmount: netInvestmentCost,
        monthlyGoalContributions
    };
}

// -------------------------------------------------------
// GET /api/income
// -------------------------------------------------------
exports.getIncome = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        const {
            balance,
            monthlyExpenses,
            monthlyInvestedAmount,
            monthlyGoalContributions
        } = await calcMonthlyBalance(req.user.id, user);

        res.json({
            totalIncome: user.totalIncome,
            totalExpenses: monthlyExpenses,
            totalInvestments: monthlyInvestedAmount,
            monthlyGoalContributions,
            totalBalance: balance,
            monthlyBudget: user.monthlyBudget
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// -------------------------------------------------------
// POST /api/income — add income
// -------------------------------------------------------
exports.addIncome = async (req, res) => {
    try {
        const { amount } = req.body;
        if (!amount || amount <= 0) return res.status(400).json({ msg: 'Valid amount required' });

        const user = await User.findById(req.user.id);
        user.totalIncome += amount;
        await user.save();

        const {
            balance,
            monthlyExpenses,
            monthlyInvestedAmount,
            monthlyGoalContributions
        } = await calcMonthlyBalance(req.user.id, user);

        res.json({
            totalIncome: user.totalIncome,
            totalExpenses: monthlyExpenses,
            totalInvestments: monthlyInvestedAmount,
            monthlyGoalContributions,
            totalBalance: balance,
            monthlyBudget: user.monthlyBudget
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// -------------------------------------------------------
// PUT /api/income/budget — set monthly budget
// -------------------------------------------------------
exports.setMonthlyBudget = async (req, res) => {
    try {
        const { monthlyBudget } = req.body;
        const user = await User.findById(req.user.id);
        user.monthlyBudget = monthlyBudget;
        await user.save();
        res.json({ monthlyBudget: user.monthlyBudget });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};