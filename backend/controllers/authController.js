const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret_key';

// @route   POST api/auth/register
// @desc    Register a user
// @access  Public
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ msg: 'User already exists' });
    }

    // Create new user
    user = new User({ name, email, password });
    await user.save();

    // Create JWT payload
    const payload = { user: { id: user.id } };

    // Generate token and return user
    jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' }, async (err, token) => {
      if (err) throw err;

      const safeUser = await User.findById(user.id).select('-password');
      res.json({ token, user: safeUser });
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// @route   POST api/auth/login
// @desc    Login user & get token
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    // Create JWT payload
    const payload = { user: { id: user.id } };

    // Generate token and return user
    jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' }, async (err, token) => {
      if (err) throw err;

      const safeUser = await User.findById(user.id).select('-password');
      res.json({ token, user: safeUser });
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// @route   GET api/auth/me
// @desc    Get current user
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};
