require('dotenv').config({
  path: require('path').join(__dirname, '..', '.env'),
});
const mongoose = require('mongoose');

// Models
const Machine = require('../models/Machine');
const Maintenance = require('../models/Maintenance');
const Cycle = require('../models/Cycle');
const ControlBI = require('../models/ControlBI');
const DeconLog = require('../models/DeconLog');
const TransportTrip = require('../models/TransportTrip');
const FuelPurchase = require('../models/FuelPurchase');
const User = require('../models/User');

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}
function atTime(date, h, m) {
  const d = new Date(date);
  d.setHours(h, m, 0, 0);
  return d;
}

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI missing in env');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('✓ Connected');

  // Wipe demo data (non-destructive beyond these collections)
  await Promise.all([
    Machine.deleteMany({}),
    Maintenance.deleteMany({}),
    Cycle.deleteMany({}),
    ControlBI.deleteMany({}),
    DeconLog.deleteMany({}),
    TransportTrip.deleteMany({}),
    FuelPurchase.deleteMany({}),
    User.deleteOne({ email: 'demo@spt.app' }),
    User.deleteOne({ email: 'supervisor@spt.app' }),
  ]);

  // Users
  const demoUser = await User.create({
    email: 'demo@spt.app',
    name: 'Demo User',
    employeeId: 'EMP-0001',
    sterilizationNumber: 'STER-001',
    password: 'demo1234',
    role: 'tech',
  });

  const superUser = await User.create({
    email: 'supervisor@spt.app',
    name: 'Supervisor User',
    employeeId: 'EMP-0000',
    sterilizationNumber: 'STER-000',
    password: 'super1234',
    role: 'admin',
  });

  console.log('✓ Demo user:', demoUser.email, '(password: demo123)');
  console.log('✓ Supervisor:', superUser.email, '(password: super123)');

  // Machines
  const [washerA, washerB, sterilizerA, sterilizerB, ultrasonicA, demoSterilizerX] =
    await Machine.create([
      {
        name: 'Washer A',
        model: 'Getinge 46',
        type: 'washer',
        location: 'Decon',
        status: 'active',
        lastDescaleAt: daysAgo(5),
      },
      {
        name: 'Washer B',
        model: 'Miele PG8582',
        type: 'washer',
        location: 'Decon',
        status: 'active',
        lastDescaleAt: daysAgo(2),
      },
      {
        name: 'Sterilizer A',
        model: 'STERIS Amsco 400',
        type: 'sterilizer',
        location: 'Sterile',
        status: 'active',
      },
      {
        name: 'Sterilizer B',
        model: 'Tuttnauer 3870EA',
        type: 'sterilizer',
        location: 'Sterile',
        status: 'active',
      },
      {
        name: 'Ultrasonic A',
        model: 'Crest Powersonic',
        type: 'ultrasonic',
        location: 'Decon',
        status: 'active',
        lastDescaleAt: daysAgo(4),
      },
      {
        name: 'Sterilizer X (Demo)',
        model: 'Demo 3000',
        type: 'sterilizer',
        location: 'Sterile',
        status: 'inactive',
      },
    ]);
  console.log('✓ Machines seeded');

  // Maintenance
  await Maintenance.create([
    {
      machineId: washerA._id,
      type: 'descale',
      volumeUsedMl: 500,
      performedAt: daysAgo(9),
      notes: 'Routine weekly descale',
      createdBy: superUser._id,
    },
    {
      machineId: washerB._id,
      type: 'descale',
      volumeUsedMl: 450,
      performedAt: daysAgo(2),
      notes: 'Mineral buildup observed',
      createdBy: demoUser._id,
    },
    {
      machineId: sterilizerA._id,
      type: 'daily_inspection',
      performedAt: daysAgo(1),
      notes: 'Door gasket OK',
      createdBy: demoUser._id,
    },
    {
      machineId: ultrasonicA._id,
      type: 'daily_inspection',
      performedAt: daysAgo(7),
      notes: 'Ultrasonic tank filter inspected as part of daily checks',
      createdBy: superUser._id,
    },
    {
      machineId: sterilizerB._id,
      type: 'daily_inspection',
      performedAt: daysAgo(14),
      notes: 'General inspection complete; parameters within spec',
      createdBy: superUser._id,
    },
  ]);

  console.log('✓ Maintenance seeded');

  // Cycles (last ~10 days)
  const sterilizers = [sterilizerA, sterilizerB];
  const washerLike = [washerA, washerB, ultrasonicA];

  const cycles = [];

  // Sterilizer cycles - 2 per day alternating spores
  for (let d = 10; d >= 0; d--) {
    for (let s = 0; s < sterilizers.length; s++) {
      const m = sterilizers[s];
      const start = atTime(daysAgo(d), 8 + s * 2, 10);
      const done = new Date(start.getTime() + 45 * 60000);
      const loadNo = String(12 - d + s).padStart(2, '0');
      const runSpore = d % 2 === 0; // every other day
      const spore = runSpore
        ? {
            ran: true,
            well: runSpore ? `W${(d % 3) + 1}` : '',
            lot: 'BI-LOT-24A',
            expireDate: daysAgo(-180),
            incubatedAt: done,
            // Leave some pending, most negative
            result: d % 4 === 0 ? '' : 'negative',
            verifiedAt: d % 4 === 0 ? null : new Date(done.getTime() + 20 * 60000),
            verifiedBy: d % 4 === 0 ? '' : 'BB',
            incubatorId: 'INC-01',
            controlNegativeOk: true,
            controlPositiveOk: true,
            readDeadlineAt: new Date(done.getTime() + 24 * 3600 * 1000),
            readAt: d % 4 === 0 ? null : new Date(done.getTime() + 20 * 60000),
          }
        : { ran: false };

      cycles.push({
        machineId: m._id,
        machineType: 'sterilizer',
        startedAt: start,
        completedAt: done,
        loadNumber: loadNo,
        result: 'pass',
        items: d % 3 === 0 ? 'Wrapped sets x4' : 'Cassettes x6',
        clinicName: d % 3 === 0 ? 'Peak Vista' : 'IC Dental',
        loadStaff: 'Sam',
        unloadStaff: 'BB',
        sterileDryMinutes: 25,
        maxTempPressure: '270°F / 27 psi',
        spore,
        createdBy: demoUser._id,
      });
    }
  }

  // Washer/Ultrasonic cycles - 1 per day across machines
  for (let d = 8; d >= 0; d--) {
    const m = washerLike[d % washerLike.length];
    const start = atTime(daysAgo(d), 13, 30);
    const done = new Date(start.getTime() + 30 * 60000);
    cycles.push({
      machineId: m._id,
      machineType: m.type,
      startedAt: start,
      completedAt: done,
      loadNumber: String(20 - d).padStart(2, '0'),
      result: 'pass',
      items: 'General instruments',
      clinicName: 'Mitchell HS',
      loadStaff: 'AL',
      unloadStaff: 'BB',
      spore: { ran: false },
      createdBy: superUser._id,
    });
  }

  await Cycle.create(cycles);
  console.log(`✓ Cycles seeded (${cycles.length})`);

  // Control BI (daily positives, verified)
  const controls = [];
  for (let d = 7; d >= 0; d--) {
    const incAt = atTime(daysAgo(d), 7, 45);
    const verAt = new Date(incAt.getTime() + 18 * 60000);
    controls.push({
      incubatorId: 'INC-01',
      lot: 'CTRL-LOT-24B',
      well: `P${(d % 4) + 1}`,
      incubatedAt: incAt,
      verifiedAt: verAt,
      result: 'positive', // Control must be positive
      verifiedBy: 'BB',
      notes: 'Daily control OK',
      createdBy: superUser._id,
    });
  }
  await ControlBI.create(controls);
  console.log('✓ Control BIs seeded');

  // Decon Logs
  await DeconLog.create([
    {
      clinic: 'IC',
      receivedAt: atTime(daysAgo(3), 9, 0),
      sentAt: atTime(daysAgo(2), 16, 0),
      verifiedInBy: 'AL',
      verifiedOutBy: 'BB',
      sets: { basic: { in: 6, out: 6 }, srp: { in: 2, out: 2 }, restorative: { in: 3, out: 3 } },
      womens: {},
      notes: 'Routine pickup/return.',
      createdBy: demoUser._id,
    },
    {
      clinic: "Women's",
      receivedAt: atTime(daysAgo(2), 10, 15),
      sentAt: atTime(daysAgo(1), 15, 45),
      verifiedInBy: 'BB',
      verifiedOutBy: 'AL',
      sets: { basic: { in: 2, out: 2 } },
      womens: { speculum: { in: 5, out: 5 }, tenaculum: { in: 3, out: 3 } },
      notes: 'All items verified with nurse on duty.',
      createdBy: superUser._id,
    },
    {
      clinic: 'Mitchell',
      receivedAt: atTime(daysAgo(1), 11, 0),
      sentAt: atTime(daysAgo(0), 14, 30),
      verifiedInBy: 'AL',
      verifiedOutBy: 'BB',
      sets: { ultrasonic: { in: 4, out: 4 }, xcp: { in: 2, out: 2 } },
      womens: {},
      notes: 'Coordinated return time with front office.',
      createdBy: demoUser._id,
    },
  ]);

  console.log('✓ Decon logs seeded');

  // Transport trips & fuel
  const trips = [];
  for (let d = 4; d >= 0; d--) {
    const date = daysAgo(d);
    const startMileage = 32100 + d * 12;
    const milesDriven = 8 + (d % 6);
    trips.push({
      date,
      driver: d % 2 === 0 ? 'BB' : 'AL',
      destination: d % 2 === 0 ? 'Downtown / IC' : "Women's Clinic",
      startMileage,
      returnMileage: startMileage + milesDriven,
      departAt: atTime(date, 9, 15),
      returnAt: atTime(date, 11, 0),
      countICPickup: d % 2 === 0 ? 1 : 0,
      countICReturn: d % 2 === 0 ? 1 : 0,
      countWomensPickup: d % 2 ? 1 : 0,
      countWomensReturn: d % 2 ? 1 : 0,
      notes: 'Sheets completed and signed.',
      techSignature: d % 2 === 0 ? 'BB' : 'AL',
      supervisorSignature: 'SU',
      createdBy: demoUser._id,
    });
  }
  await TransportTrip.create(trips);

  await FuelPurchase.create([
    {
      date: atTime(daysAgo(3), 12, 10),
      mileage: 32155,
      pricePerGallon: 3.799,
      gallons: 9.2,
      amount: 34.95,
      vendor: 'Shell',
      signature: 'BB',
      notes: 'Work truck',
      createdBy: superUser._id,
    },
    {
      date: atTime(daysAgo(1), 13, 40),
      mileage: 32218,
      pricePerGallon: 3.659,
      gallons: 8.4,
      amount: 30.74,
      vendor: 'Sinclair',
      signature: 'AL',
      notes: '',
      createdBy: demoUser._id,
    },
  ]);
  console.log('✓ Transport trips & fuel seeded');

  await mongoose.disconnect();
  console.log('✓ Done');
}

main().catch((e) => {
  console.error('Seed error:', e);
  process.exit(1);
});
