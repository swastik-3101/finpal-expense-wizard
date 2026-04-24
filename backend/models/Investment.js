// models/Investment.js
const mongoose = require('mongoose');

const investmentSchema = new mongoose.Schema(
    {
        userId: { type: String, required: true },
        symbol: { type: String, required: true },
        quantity: { type: Number, required: true },
        avgPrice: { type: Number, required: true },
    },
    { timestamps: true }
);

investmentSchema.index({ userId: 1, symbol: 1 }, { unique: true });

module.exports = mongoose.model('Investment', investmentSchema);


// --------------------------------------------------------
// models/InvestmentTransaction.js
// --------------------------------------------------------
// const mongoose = require('mongoose');
//
// const txnSchema = new mongoose.Schema(
//   {
//     userId:   { type: String, required: true },
//     symbol:   { type: String, required: true },
//     quantity: { type: Number, required: true },
//     price:    { type: Number, required: true },
//     type:     { type: String, enum: ['BUY', 'SELL'], required: true },
//   },
//   { timestamps: true }
// );
//
// module.exports = mongoose.model('InvestmentTransaction', txnSchema);