const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    description: { type: String },
    targetAmount: { type: Number, required: true },
    currentAmount: { type: Number, default: 0 },
    progressPercent: { type: Number, default: 0 },
    startDate: { type: Date },
    targetDate: { type: Date },
    category: { type: String },
    status: { type: String, default: 'in-progress' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

goalSchema.methods.updateProgress = function () {
    if (this.targetAmount > 0) {
        this.progressPercent = (this.currentAmount / this.targetAmount) * 100;
    } else {
        this.progressPercent = 0;
    }
};

module.exports = mongoose.model('Goal', goalSchema);