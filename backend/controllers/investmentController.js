const Investment = require('../models/Investment');
const InvestmentTransaction = require('../models/InvestmentTransaction');
const axios = require('axios');

const FINNHUB_KEY = 'd7j1kq1r01qn2qavqepgd7j1kq1r01qn2qavqeq0';

// -------------------------------------------------------
// Helper: Get current price from Finnhub
// -------------------------------------------------------
async function getCurrentPrice(symbol) {
    const url = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_KEY}`;
    const { data } = await axios.get(url);
    return data?.c; // "c" = current price in Finnhub
}

// -----------------------------
// BUY STOCK
// POST /api/investments/buy
// -----------------------------
const buyStock = async (req, res) => {
    try {
        const userId = req.user._id;
        const { symbol, quantity } = req.body;

        if (!symbol || !quantity || quantity <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid symbol or quantity'
            });
        }

        const price = await getCurrentPrice(symbol);

        if (!price || price <= 0) {
            return res.status(404).json({
                success: false,
                message: `Stock price not available for: ${symbol}`
            });
        }

        // Save transaction
        await InvestmentTransaction.create({
            userId,
            symbol,
            quantity,
            price,
            type: 'BUY'
        });

        // Update or create Investment
        const existing = await Investment.findOne({ userId, symbol });

        if (existing) {
            const newQty = existing.quantity + quantity;
            const newAvg =
                (existing.avgPrice * existing.quantity + price * quantity) / newQty;

            existing.quantity = newQty;
            existing.avgPrice = newAvg;
            existing.updatedAt = new Date();

            await existing.save();
        } else {
            await Investment.create({
                userId,
                symbol,
                quantity,
                avgPrice: price
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Stock purchased successfully'
        });
    } catch (err) {
        console.error('buyStock error:', err.message);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// -----------------------------
// SELL STOCK
// POST /api/investments/sell
// -----------------------------
const sellStock = async (req, res) => {
    try {
        const userId = req.user._id;
        const { symbol, quantity } = req.body;

        if (!symbol || !quantity || quantity <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid symbol or quantity'
            });
        }

        const inv = await Investment.findOne({ userId, symbol });

        if (!inv) {
            return res.status(404).json({
                success: false,
                message: `Investment not found for symbol: ${symbol}`
            });
        }

        if (inv.quantity < quantity) {
            return res.status(403).json({
                success: false,
                message: 'Not enough quantity to sell'
            });
        }

        const price = await getCurrentPrice(symbol);

        if (!price || price <= 0) {
            return res.status(404).json({
                success: false,
                message: `Stock price not available for: ${symbol}`
            });
        }

        // Save transaction
        await InvestmentTransaction.create({
            userId,
            symbol,
            quantity,
            price,
            type: 'SELL'
        });

        const remaining = inv.quantity - quantity;

        if (remaining === 0) {
            await Investment.deleteOne({ userId, symbol });
        } else {
            inv.quantity = remaining;
            await inv.save();
        }

        return res.status(200).json({
            success: true,
            message: 'Stock sold successfully'
        });
    } catch (err) {
        console.error('sellStock error:', err.message);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// -----------------------------
// GET PORTFOLIO
// GET /api/investments/portfolio
// -----------------------------
const getPortfolio = async (req, res) => {
    try {
        const userId = req.user._id;
        const investments = await Investment.find({ userId });

        const portfolio = await Promise.all(
            investments.map(async (inv) => {
                const currentPrice = await getCurrentPrice(inv.symbol);

                if (!currentPrice || currentPrice <= 0) {
                    throw new Error(`Price not available for: ${inv.symbol}`);
                }

                const currentValue = currentPrice * inv.quantity;
                const investedValue = inv.avgPrice * inv.quantity;
                const profit = currentValue - investedValue;
                const profitPercent =
                    investedValue === 0
                        ? 0
                        : (profit / investedValue) * 100;

                return {
                    symbol: inv.symbol,
                    quantity: inv.quantity,
                    avgPrice: inv.avgPrice,
                    currentPrice,
                    currentValue,
                    investedValue,
                    profit,
                    profitPercent
                };
            })
        );

        return res.status(200).json({
            success: true,
            data: portfolio
        });
    } catch (err) {
        console.error('getPortfolio error:', err.message);
        return res.status(500).json({
            success: false,
            message: err.message || 'Internal server error'
        });
    }
};

// -----------------------------
// GET PORTFOLIO SUMMARY
// GET /api/investments/portfolio/summary
// -----------------------------
const getPortfolioSummary = async (req, res) => {
    try {
        const userId = req.user._id;
        const investments = await Investment.find({ userId });

        let totalInvested = 0;
        let totalCurrentValue = 0;

        await Promise.all(
            investments.map(async (inv) => {
                const currentPrice = await getCurrentPrice(inv.symbol);

                if (!currentPrice || currentPrice <= 0) return;

                totalInvested += inv.avgPrice * inv.quantity;
                totalCurrentValue += currentPrice * inv.quantity;
            })
        );

        const totalProfit = totalCurrentValue - totalInvested;
        const profitPercent =
            totalInvested === 0
                ? 0
                : (totalProfit / totalInvested) * 100;

        return res.status(200).json({
            success: true,
            data: {
                totalInvested,
                totalCurrentValue,
                totalProfit,
                profitPercent
            }
        });
    } catch (err) {
        console.error('getPortfolioSummary error:', err.message);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// -----------------------------
// GET ALL INVESTMENTS (RAW)
// GET /api/investments
// -----------------------------
const getAllInvestments = async (req, res) => {
    try {
        const userId = req.user._id;
        const investments = await Investment.find({ userId });

        return res.status(200).json({
            success: true,
            data: investments
        });
    } catch (err) {
        console.error('getAllInvestments error:', err.message);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// -----------------------------
// GET TRANSACTION HISTORY
// GET /api/investments/transactions
// -----------------------------
const getTransactions = async (req, res) => {
    try {
        const userId = req.user._id;
        const transactions = await InvestmentTransaction.find({ userId })
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            data: transactions
        });
    } catch (err) {
        console.error('getTransactions error:', err.message);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

module.exports = {
    buyStock,
    sellStock,
    getPortfolio,
    getPortfolioSummary,
    getAllInvestments,
    getTransactions
};