const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
  const uri = process.env.MONGO_URI || 'mongodb+srv://vanshajbairagi10_db_user:JmSP6v9qAMx75VBR@cluster0.qnzs16w.mongodb.net/Pharmlab2';

  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  logger.info('MongoDB connected');
};

module.exports = connectDB;
