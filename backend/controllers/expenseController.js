const Expense = require('../models/Expense');
const multer = require('multer');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function(req, file, cb) {
    cb(null, new Date().toISOString().replace(/:/g, '-') + '-' + file.originalname);
  }
});

// File filter for receipt uploads
const fileFilter = (req, file, cb) => {
  // Accept only images
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Please upload only image files'), false);
  }
};

// Initialize multer upload
exports.upload = multer({
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 5 // Limit to 5MB
  },
  fileFilter: fileFilter
}).single('receipt');

// @route   GET api/expenses
// @desc    Get all expenses for the logged-in user
// @access  Private
exports.getExpenses = async (req, res) => {
  try {
    const expenses = await Expense.find({ user: req.user.id }).sort({ date: -1 });
    res.json(expenses);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// @route   POST api/expenses
// @desc    Create a new expense
// @access  Private
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

// @route   PUT api/expenses/:id
// @desc    Update an expense
// @access  Private
exports.updateExpense = async (req, res) => {
  try {
    const { title, amount, category, date } = req.body;

    // Check if expense exists
    let expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({ msg: 'Expense not found' });
    }

    // Check if expense belongs to user
    if (expense.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Not authorized' });
    }

    // Update expense
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

// @route   DELETE api/expenses/:id
// @desc    Delete an expense
// @access  Private
exports.deleteExpense = async (req, res) => {
  try {
    // Check if expense exists
    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({ msg: 'Expense not found' });
    }

    // Check if expense belongs to user
    if (expense.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Not authorized' });
    }

    await Expense.findByIdAndRemove(req.params.id);
    res.json({ msg: 'Expense removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// @route   GET api/expenses/categories
// @desc    Get expense categories
// @access  Private
exports.getCategories = async (req, res) => {
  try {
    // Get distinct categories for this user
    const categories = await Expense.distinct('category', { user: req.user.id });
    
    // If no custom categories yet, return default ones
    if (categories.length === 0) {
      return res.json([
        'Food', 
        'Transportation', 
        'Housing', 
        'Utilities', 
        'Entertainment', 
        'Healthcare', 
        'Shopping', 
        'Other'
      ]);
    }
    
    res.json(categories);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// @route   POST api/expenses/upload-receipt
// @desc    Upload and process a receipt image
// @access  Private
exports.uploadReceipt = async (req, res) => {
  try {
    // In a real application, you would process the uploaded receipt image here
    // This could involve OCR to extract expense information
    
    // For now, we'll just acknowledge the upload
    if (!req.file) {
      return res.status(400).json({ msg: 'No file uploaded' });
    }
    
    res.json({ 
      msg: 'Receipt uploaded successfully',
      file: req.file.filename,
      // In a real app, you would return extracted data from the receipt
      suggestedExpense: {
        title: 'Receipt Upload',
        amount: 0,
        category: 'Other',
        date: new Date().toISOString().split('T')[0]
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};