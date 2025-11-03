const mongoose = require('mongoose');
const logger = require('../utils/logger');

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function connectDB(uri) {
  if (!uri) throw new Error('Missing MONGO_URI');

  mongoose.set('strictQuery', true);

  const MAX_TRIES = 5;
  const TIMEOUT_MS = 30000;

  for (let attempt = 1; attempt <= MAX_TRIES; attempt++) {
    try {
      logger.info(`Connecting to MongoDB (attempt ${attempt}/${MAX_TRIES})...`);
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: TIMEOUT_MS,
      });
      logger.info('✓ MongoDB connected');
      return;
    } catch (err) {
      logger.error(`✗ MongoDB connection failed (attempt ${attempt}):`, err.message);
      if (attempt === MAX_TRIES) throw err;

      await sleep(3000);
    }
  }
}

module.exports = { connectDB };
