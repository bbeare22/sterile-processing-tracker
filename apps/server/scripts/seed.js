require("dotenv").config({
  path: require("path").join(__dirname, "..", ".env"),
});
const mongoose = require("mongoose");

// ---- models ----
const Machine = require("../models/Machine");
const Maintenance = require("../models/Maintenance");
const Cycle = require("../models/Cycle");
const User = require("../models/User");

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("MONGO_URI missing in env");
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log("✓ Connected");

  // Clean demo data (non-destructive for other users/machines if you later add them)
  await Promise.all([
    Machine.deleteMany({}),
    Maintenance.deleteMany({}),
    Cycle.deleteMany({}),
    User.deleteOne({ email: "demo@spt.app" }),
    User.deleteOne({ email: "supervisor@spt.app" }),
  ]);

  // Users
  const demoUser = await User.create({
    email: "demo@spt.app",
    name: "Demo User",
    employeeId: "EMP-0001",
    sterilizationNumber: "STER-001",
    password: "demo123",
    role: "tech", // valid role
  });

  const superUser = await User.create({
    email: "supervisor@spt.app",
    name: "Supervisor User",
    employeeId: "EMP-0000",
    sterilizationNumber: "STER-000",
    password: "super123",
    role: "supervisor", // elevated role
  });

  console.log("✓ Demo user:", demoUser.email, "(password: demo123)");
  console.log("✓ Supervisor:", superUser.email, "(password: super123)");

  // Helpers
  const now = new Date();
  const daysAgo = (d) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000);

  // Machines
  const washerA = await Machine.create({
    name: "AMSCO 5000",
    model: "5000",
    type: "washer",
    location: "SPD A",
    status: "active",
    lastDescaleAt: daysAgo(9),
  });

  const washerB = await Machine.create({
    name: "Getinge 46",
    model: "46-5",
    type: "washer",
    location: "SPD B",
    status: "active",
    lastDescaleAt: daysAgo(2),
  });

  const sterilizerA = await Machine.create({
    name: "STERIS 400",
    model: "400",
    type: "sterilizer",
    location: "OR Core",
    status: "active",
  });

  const ultrasonicA = await Machine.create({
    name: "Soniclean 200",
    model: "SC-200",
    type: "ultrasonic",
    location: "Decon",
    status: "active",
    lastDescaleAt: daysAgo(5),
  });

  console.log("✓ Machines seeded");

  // Maintenance
  await Maintenance.create([
    {
      machineId: washerA._id,
      type: "descale",
      volumeUsedMl: 500,
      performedAt: daysAgo(9),
      notes: "Routine weekly descale",
    },
    {
      machineId: washerB._id,
      type: "descale",
      volumeUsedMl: 450,
      performedAt: daysAgo(2),
      notes: "Slight mineral buildup",
    },
    {
      machineId: sterilizerA._id,
      type: "daily_inspection",
      performedAt: daysAgo(1),
      notes: "Door gasket good",
    },
    {
      machineId: sterilizerA._id,
      type: "cleaning", // quarterly cleaning
      performedAt: daysAgo(30),
      notes: "Quarterly cleaning complete",
    },
  ]);
  console.log("✓ Maintenance seeded");

  // Cycles (sterilizer)
  await Cycle.create([
    {
      machineId: sterilizerA._id,
      machineType: "sterilizer",
      startedAt: daysAgo(0),
      completedAt: daysAgo(0),
      loadNumber: "01",
      result: "pass",
      items: "x10 Pouches — OS(4), XCP(6)",
      clinicName: "Peak Vista",
      loadStaff: "Logan",
      unloadStaff: "BB",
      sterileDryMinutes: 30,
      maxTempPressure: "270°F / 27 psi",
      spore: {
        ran: true,
        well: "2",
        lot: "AB-123",
        expireDate: daysAgo(-180),
        incubatedAt: daysAgo(0),
        result: "negative",
      },
    },
    {
      machineId: sterilizerA._id,
      machineType: "sterilizer",
      startedAt: daysAgo(0.3),
      completedAt: daysAgo(0.3),
      loadNumber: "02",
      result: "pass",
      items: "Wrapped sets x4",
      clinicName: "Peak Vista",
      loadStaff: "Sam",
      unloadStaff: "BB",
      sterileDryMinutes: 25,
      maxTempPressure: "270°F / 27 psi",
      spore: { ran: false },
    },
  ]);
  console.log("✓ Cycles seeded");

  await mongoose.disconnect();
  console.log("✓ Done");
}

main().catch((e) => {
  console.error("Seed error:", e);
  process.exit(1);
});
