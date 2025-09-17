const mongoose = require("mongoose");

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function connectDB(uri) {
  if (!uri) throw new Error("Missing MONGO_URI");

  mongoose.set("strictQuery", true);

  const MAX_TRIES = 5;
  const TIMEOUT_MS = 30000;

  for (let attempt = 1; attempt <= MAX_TRIES; attempt++) {
    try {
      console.log(`Connecting to MongoDB (attempt ${attempt}/${MAX_TRIES})...`);
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: TIMEOUT_MS,
      });
      console.log("✓ MongoDB connected");
      return;
    } catch (err) {
      console.error(
        `✗ MongoDB connection failed (attempt ${attempt}):`,
        err.message
      );
      if (attempt === MAX_TRIES) throw err;

      await sleep(3000);
    }
  }
}

module.exports = { connectDB };
