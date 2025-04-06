const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Replace <db_password> with your actual password
    const mongoURI = 'mongodb+srv://swastikkr1908:jqJRtEj7idmbbotI@cluster0.oyvppnk.mongodb.net/finpal';

    await mongoose.connect(mongoURI);
    
    console.log('MongoDB Connected');
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;