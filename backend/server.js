require('dotenv').config()
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const authRoutes = require('./routes/authRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const investmentRoutes = require('./routes/investmentRoutes');
const marketRoutes = require('./routes/marketRoutes');
const insightsRoutes = require('./routes/insightsRoutes');


// Connect to database
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/uploads', express.static('uploads'));

app.use('/api/auth', authRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/investments', investmentRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/insights', insightsRoutes);

// Error handler
app.use(errorHandler);

// Set port
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});