require("dotenv").config({
  path: require("path").join(__dirname, "..", ".env"),
});
const mongoose = require("mongoose");

const Maintenance = require("../models/Maintenance");
const Cycle = require("../models/Cycle");
const DeconLog = require("../models/DeconLog");
const ControlBI = require("../models/ControlBI");
const TransportTrip = require("../models/TransportTrip");
const FuelPurchase = require("../models/FuelPurchase");
const AuditLog = require("../models/AuditLog");

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

    // Optional flags
    const wipeMachines = process.argv.includes("--machines");
    const wipeUsers = process.argv.includes("--users");

    // --- Show before counts
    const countsBefore = await Promise.all([
      Maintenance.countDocuments({}),
      Cycle.countDocuments({}),
      DeconLog.countDocuments({}),
      ControlBI.countDocuments({}),
      TransportTrip.countDocuments({}),
      FuelPurchase.countDocuments({}),
      AuditLog.countDocuments({}),
    ]);

    console.log(
      `Before: maint=${countsBefore[0]}, cycles=${countsBefore[1]}, decon=${countsBefore[2]}, control=${countsBefore[3]}, transport=${countsBefore[4]}, fuel=${countsBefore[5]}, audit=${countsBefore[6]}`
    );

    // --- Delete all operational logs
    const results = await Promise.all([
      Maintenance.deleteMany({}),
      Cycle.deleteMany({}),
      DeconLog.deleteMany({}),
      ControlBI.deleteMany({}),
      TransportTrip.deleteMany({}),
      FuelPurchase.deleteMany({}),
      AuditLog.deleteMany({}),
    ]);

    console.log(
      `Deleted: maint=${results[0].deletedCount}, cycles=${results[1].deletedCount}, decon=${results[2].deletedCount}, control=${results[3].deletedCount}, transport=${results[4].deletedCount}, fuel=${results[5].deletedCount}, audit=${results[6].deletedCount}`
    );

    // --- Optional extras
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

    // --- After counts
    const countsAfter = await Promise.all([
      Maintenance.countDocuments({}),
      Cycle.countDocuments({}),
      DeconLog.countDocuments({}),
      ControlBI.countDocuments({}),
      TransportTrip.countDocuments({}),
      FuelPurchase.countDocuments({}),
      AuditLog.countDocuments({}),
    ]);

    console.log(
      `After: maint=${countsAfter[0]}, cycles=${countsAfter[1]}, decon=${countsAfter[2]}, control=${countsAfter[3]}, transport=${countsAfter[4]}, fuel=${countsAfter[5]}, audit=${countsAfter[6]}`
    );

    await mongoose.disconnect();
    console.log("✓ Done — dev data cleared (users & machines preserved)");
  } catch (e) {
    console.error("Reset error:", e);
    process.exit(1);
  }
})();
