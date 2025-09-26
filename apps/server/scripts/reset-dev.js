// apps/server/scripts/reset-dev.js
require("dotenv").config({
  path: require("path").join(__dirname, "..", ".env"),
});
const mongoose = require("mongoose");

const Maintenance = require("../models/Maintenance");
const Cycle = require("../models/Cycle");
// If you ever want to also wipe machines/users, you can import:
// const Machine = require("../models/Machine");
// const User = require("../models/User");

(async function main() {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) {
      console.error("❌ Missing MONGO_URI in apps/server/.env");
      process.exit(1);
    }
    console.log("Connecting…");
    await mongoose.connect(uri);
    console.log("✓ Connected");

    // Parse optional flags
    const wipeMachines = process.argv.includes("--machines");
    const wipeUsers = process.argv.includes("--users");

    // Show before counts
    const [maintBefore, cyclesBefore] = await Promise.all([
      Maintenance.countDocuments({}),
      Cycle.countDocuments({}),
    ]);
    console.log(`Before: maintenance=${maintBefore}, cycles=${cyclesBefore}`);

    // Delete core activity data
    const [maintDel, cyclesDel] = await Promise.all([
      Maintenance.deleteMany({}),
      Cycle.deleteMany({}),
    ]);
    console.log(
      `Deleted: maintenance=${maintDel.deletedCount}, cycles=${cyclesDel.deletedCount}`
    );

    // Optional extras (disabled by default)
    if (wipeMachines) {
      const Machine = require("../models/Machine");
      const mDel = await Machine.deleteMany({});
      console.log(`Deleted machines=${mDel.deletedCount}`);
    }
    if (wipeUsers) {
      const User = require("../models/User");
      const uDel = await User.deleteMany({});
      console.log(`Deleted users=${uDel.deletedCount}`);
    }

    // Show after counts
    const [maintAfter, cyclesAfter] = await Promise.all([
      Maintenance.countDocuments({}),
      Cycle.countDocuments({}),
    ]);
    console.log(`After: maintenance=${maintAfter}, cycles=${cyclesAfter}`);

    await mongoose.disconnect();
    console.log("✓ Done");
  } catch (e) {
    console.error("Reset error:", e);
    process.exit(1);
  }
})();
