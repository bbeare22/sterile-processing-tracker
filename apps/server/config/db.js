const mongoose = require("mongoose");

async function connectDB(uri) {
  if (!uri) throw new Error("Missing MONGO_URI");
  try {
    mongoose.set("strictQuery", true);
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
    console.log("✓ MongoDB connected");
  } catch (err) {
    console.error("✗ MongoDB connection failed:", err.message);
    throw err;
  }
}

module.exports = { connectDB };
