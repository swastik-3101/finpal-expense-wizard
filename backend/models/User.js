const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  // ----------- LIFETIME TOTALS -----------
  totalIncome: { type: Number, default: 0 },
  totalExpenses: { type: Number, default: 0 },
  totalInvestments: { type: Number, default: 0 },
  totalGoalContributions: { type: Number, default: 0 },
  totalBalance: { type: Number, default: 0 },
  // ----------- BUDGET -----------
  monthlyBudget: { type: Number, default: 0 },
  // ----------- MONTHLY GOAL CONTRIBUTIONS -----------
  monthlyGoalContributions: { type: Number, default: 0 },
  monthlyGoalContributionsMonth: { type: Number, default: -1 }, // tracks which month was last reset
  monthlyGoalContributionsYear: { type: Number, default: -1 },
  createdAt: { type: Date, default: Date.now }
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('User', userSchema);