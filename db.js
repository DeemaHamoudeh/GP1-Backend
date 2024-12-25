const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const DB_URI = 'mongodb://localhost:27017/StoreMaster'; // Replace with your DB name
    await mongoose.connect(DB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1); // Exit the process with failure
  }
};

module.exports = connectDB;
