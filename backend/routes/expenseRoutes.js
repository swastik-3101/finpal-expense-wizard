const express = require('express');
const router = express.Router();
const { 
  getExpenses, 
  createExpense, 
  updateExpense, 
  deleteExpense, 
  getCategories,
  upload,
  uploadReceipt,
  getChatContext
} = require('../controllers/expenseController');
const auth = require('../middleware/auth');
const { check, validationResult } = require('express-validator');

// Validation middleware
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// @route   GET api/expenses
// @desc    Get all expenses for logged-in user
// @access  Private
router.get('/', auth, getExpenses);

// @route   POST api/expenses
// @desc    Create a new expense
// @access  Private
router.post(
  '/',
  [
    auth,
    [
      check('title', 'Title is required').not().isEmpty(),
      check('amount', 'Amount is required and must be a number').isNumeric(),
      check('category', 'Category is required').not().isEmpty(),
      check('date', 'Date is required').not().isEmpty()
    ],
    validateRequest
  ],
  createExpense
);

// @route   PUT api/expenses/:id
// @desc    Update an expense
// @access  Private
router.put(
  '/:id',
  [
    auth,
    [
      check('title', 'Title is required').optional(),
      check('amount', 'Amount must be a number').optional().isNumeric(),
      check('category', 'Category is required').optional(),
      check('date', 'Date is required').optional()
    ],
    validateRequest
  ],
  updateExpense
);

// @route   DELETE api/expenses/:id
// @desc    Delete an expense
// @access  Private
router.delete('/:id', auth, deleteExpense);

// @route   GET api/expenses/categories
// @desc    Get expense categories
// @access  Private
router.get('/categories', auth, getCategories);

// @route   POST api/expenses/upload-receipt
// @desc    Upload and process a receipt image
// @access  Private
router.post('/upload-receipt', auth, upload, uploadReceipt);
router.get('/chat-context', auth, getChatContext);

module.exports = router;