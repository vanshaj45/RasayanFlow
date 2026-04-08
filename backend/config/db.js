const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    throw new Error('MONGO_URI is required. Set it in backend/.env');
  }

  await mongoose.connect(uri);

  logger.info('MongoDB connected');
};

module.exports = connectDB;
