const Expense = require('../models/Expense');
const multer = require('multer');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Multer disk storage config
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function(req, file, cb) {
    cb(null, new Date().toISOString().replace(/:/g, '-') + '-' + file.originalname.replace(/\s/g, '_'));
  }
});

// Accept only image files
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files allowed'), false);
  }
};

// Multer middleware for single receipt upload
exports.upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter
}).single('receipt');

// Get all expenses for logged-in user
exports.getExpenses = async (req, res) => {
  try {
    const expenses = await Expense.find({ user: req.user.id }).sort({ date: -1 });
    res.json(expenses);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// Create a new expense
exports.createExpense = async (req, res) => {
  try {
    const { title, amount, category, date } = req.body;

    const newExpense = new Expense({
      title,
      amount,
      category,
      date,
      user: req.user.id
    });

    const expense = await newExpense.save();
    res.json(expense);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// Update an existing expense
exports.updateExpense = async (req, res) => {
  try {
    const { title, amount, category, date } = req.body;

    let expense = await Expense.findById(req.params.id);
    if (!expense) return res.status(404).json({ msg: 'Expense not found' });

    if (expense.user.toString() !== req.user.id) return res.status(401).json({ msg: 'Not authorized' });

    expense = await Expense.findByIdAndUpdate(
      req.params.id,
      { $set: { title, amount, category, date } },
      { new: true }
    );

    res.json(expense);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// Delete an expense
exports.deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) return res.status(404).json({ msg: 'Expense not found' });

    if (expense.user.toString() !== req.user.id) return res.status(401).json({ msg: 'Not authorized' });

    await Expense.findByIdAndRemove(req.params.id);
    res.json({ msg: 'Expense removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// Get distinct expense categories
exports.getCategories = async (req, res) => {
  try {
    const categories = await Expense.distinct('category', { user: req.user.id });
    if (categories.length === 0) {
      return res.json([
        'Food', 'Transportation', 'Housing', 'Utilities', 'Entertainment', 'Healthcare', 'Shopping', 'Other'
      ]);
    }
    res.json(categories);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// Upload receipt and process with Python OCR script
exports.uploadReceipt = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ msg: 'No file uploaded' });

    const filePath = path.resolve(req.file.path);

    const pythonProcess = spawn(
  'C:\\Users\\swast\\AppData\\Local\\Programs\\Python\\Python312\\python.exe',
  ['scripts/process_reciepts.py', filePath]
);


    let data = '';
    let errorData = '';

    pythonProcess.stdout.on('data', chunk => {
      data += chunk.toString();
    });

    pythonProcess.stderr.on('data', chunk => {
      errorData += chunk.toString();
    });

    pythonProcess.on('close', (code) => {
      // Delete uploaded file after processing
      fs.unlink(filePath, err => {
        if (err) console.error('Error deleting uploaded receipt:', err);
      });

      if (code !== 0) {
        console.error('Python script error:', errorData);
        return res.status(500).json({ msg: 'Error processing receipt' });
      }

      try {
        const parsedData = JSON.parse(data);
        // Optionally, you can save parsedData as an expense here or send to client

        res.json({
          msg: 'Receipt processed successfully',
          parsedExpense: parsedData
        });
      } catch (err) {
        console.error('JSON parse error:', err);
        res.status(500).json({ msg: 'Failed to parse receipt processing output' });
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

// Get summarized expense context for chatbot (last 30 days)
exports.getChatContext = async (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);

    const expenses = await Expense.find({
      user: userId,
      date: { $gte: thirtyDaysAgo.toISOString() }
    });

    if (!expenses.length) {
      return res.json({ context: "You have no expenses in the past 30 days." });
    }

    let total = 0;
    const categoryTotals = {};
    let highestExpense = { title: "", amount: 0 };

    for (const exp of expenses) {
      total += exp.amount;
      categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;

      if (exp.amount > highestExpense.amount) {
        highestExpense = { title: exp.title, amount: exp.amount };
      }
    }

    const days = (today - thirtyDaysAgo) / (1000 * 60 * 60 * 24);
    const averagePerDay = total / days;

    const topCategories = Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([cat, amt]) => `${cat}: $${amt.toFixed(2)}`)
      .join(", ");

    const summary =
      `In the last 30 days, you spent a total of $${total.toFixed(2)}.\n` +
      `Top categories: ${topCategories}.\n` +
      `Your highest expense was "${highestExpense.title}" at $${highestExpense.amount.toFixed(2)}.\n` +
      `You're spending an average of $${averagePerDay.toFixed(2)} per day.`;

    res.json({ context: summary });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Failed to generate chat context" });
  }
};
