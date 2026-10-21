/**
 * Seed script — creates realistic data for all roles, including BR-6 trigger scenario.
 * Run: npm run seed
 */
require('dotenv').config();
const mongoose = require('mongoose');
const { User } = require('./models/User');
const { Slot } = require('./models/Slot');
const { Signup } = require('./models/Signup');
const { AuditLog } = require('./models/AuditLog');
const connectDB = require('./config/database');

// Helper to build IST datetime as UTC Date
const makeIST = (dateStr, hour, minute = 0) => {
  // dateStr: 'YYYY-MM-DD', IST = UTC + 5:30
  const [y, m, d] = dateStr.split('-').map(Number);
  const utcHour = hour - 5;
  const utcMinute = minute - 30;
  return new Date(Date.UTC(y, m - 1, d, utcHour, utcMinute));
};

// Future dates relative to now
const futureDate = (daysFromNow) => {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().substring(0, 10);
};

async function seed() {
  await connectDB();
  console.log('🌱 Clearing existing data...');
  await Promise.all([
    User.deleteMany({}),
    Slot.deleteMany({}),
    Signup.deleteMany({}),
    AuditLog.deleteMany({}),
  ]);

  // ── Users ──────────────────────────────────────────────────────────────────
  console.log('👤 Creating users...');

  const admin = await User.create({
    name: 'Priya HR (Admin)',
    email: 'admin@sundar.com',
    password: 'Admin@1234',
    role: 'admin',
  });

  const machiningManager = await User.create({
    name: 'Ramesh Kumar',
    email: 'manager.machining@sundar.com',
    password: 'Manager@1234',
    role: 'manager',
    department: 'Machining',
  });

  const assemblyManager = await User.create({
    name: 'Sunita Rao',
    email: 'manager.assembly@sundar.com',
    password: 'Manager@1234',
    role: 'manager',
    department: 'Assembly',
  });

  // Machining employees
  const ravi = await User.create({
    name: 'Ravi Shankar',
    email: 'ravi@sundar.com',
    password: 'Employee@1234',
    role: 'employee',
    department: 'Machining',
    weeklyOtCapHours: 12,
  });

  const priya = await User.create({
    name: 'Priya Nair',
    email: 'priya.employee@sundar.com',
    password: 'Employee@1234',
    role: 'employee',
    department: 'Machining',
    weeklyOtCapHours: 12,
  });

  const kiran = await User.create({
    name: 'Kiran Desai',
    email: 'kiran@sundar.com',
    password: 'Employee@1234',
    role: 'employee',
    department: 'Machining',
    weeklyOtCapHours: 12,
  });

  const vijay = await User.create({
    name: 'Vijay Patil',
    email: 'vijay@sundar.com',
    password: 'Employee@1234',
    role: 'employee',
    department: 'Machining',
    weeklyOtCapHours: 10,
  });

  // Assembly employees
  const anita = await User.create({
    name: 'Anita Mehta',
    email: 'anita@sundar.com',
    password: 'Employee@1234',
    role: 'employee',
    department: 'Assembly',
    weeklyOtCapHours: 12,
  });

  const deepak = await User.create({
    name: 'Deepak Singh',
    email: 'deepak@sundar.com',
    password: 'Employee@1234',
    role: 'employee',
    department: 'Assembly',
    weeklyOtCapHours: 12,
  });

  const meena = await User.create({
    name: 'Meena Joshi',
    email: 'meena@sundar.com',
    password: 'Employee@1234',
    role: 'employee',
    department: 'Assembly',
    weeklyOtCapHours: 8,
  });

  const suresh = await User.create({
    name: 'Suresh Patel',
    email: 'suresh@sundar.com',
    password: 'Employee@1234',
    role: 'employee',
    department: 'Quality',
    weeklyOtCapHours: 12,
  });

  // ── Slots ──────────────────────────────────────────────────────────────────
  console.log('📅 Creating slots...');
  const d1 = futureDate(1); // tomorrow
  const d2 = futureDate(2);
  const d3 = futureDate(3);
  const d4 = futureDate(4);
  const d5 = futureDate(5);

  // Machining slots
  const slot1 = await Slot.create({
    title: 'CNC Machine Run – Evening Shift',
    department: 'Machining',
    date: d1,
    startTime: makeIST(d1, 18, 0),
    endTime: makeIST(d1, 21, 0), // 3 hours
    headcountRequired: 3,
    createdBy: machiningManager._id,
  });

  const slot2 = await Slot.create({
    title: 'Weekend Lathe Operation',
    department: 'Machining',
    date: d3,
    startTime: makeIST(d3, 8, 0),
    endTime: makeIST(d3, 14, 0), // 6 hours (max)
    headcountRequired: 2,
    createdBy: machiningManager._id,
  });

  // This slot is designed to trigger BR-6 for Ravi
  // Ravi already has 10h approved — this 4h slot would breach his 12h cap
  const slot3 = await Slot.create({
    title: 'Quality Inspection Prep',
    department: 'Machining',
    date: d4,
    startTime: makeIST(d4, 18, 0),
    endTime: makeIST(d4, 22, 0), // 4 hours
    headcountRequired: 2,
    createdBy: machiningManager._id,
  });

  // Assembly slots
  const slot4 = await Slot.create({
    title: 'Urgent Order Assembly – Night',
    department: 'Assembly',
    date: d2,
    startTime: makeIST(d2, 19, 0),
    endTime: makeIST(d2, 23, 0), // 4 hours
    headcountRequired: 4,
    createdBy: assemblyManager._id,
  });

  const slot5 = await Slot.create({
    title: 'Dispatch Prep Weekend',
    department: 'Assembly',
    date: d5,
    startTime: makeIST(d5, 9, 0),
    endTime: makeIST(d5, 13, 0), // 4 hours
    headcountRequired: 2,
    createdBy: assemblyManager._id,
  });

  // ── Signups & Approvals ────────────────────────────────────────────────────
  console.log('✍️  Creating signups and approvals...');

  // Slot 1: Ravi signed up and approved (3h)
  const s1_ravi = await Signup.create({ slot: slot1._id, employee: ravi._id, status: 'pending' });
  s1_ravi.status = 'approved';
  s1_ravi.decidedBy = machiningManager._id;
  s1_ravi.decidedAt = new Date();
  s1_ravi.approvedStartTime = slot1.startTime;
  s1_ravi.approvedEndTime = slot1.endTime;
  await s1_ravi.save();

  // Slot 2: Ravi approved (6h) — now Ravi has 3+6=9h this week, cap=12h
  const s2_ravi = await Signup.create({ slot: slot2._id, employee: ravi._id, status: 'pending' });
  s2_ravi.status = 'approved';
  s2_ravi.decidedBy = machiningManager._id;
  s2_ravi.decidedAt = new Date();
  s2_ravi.approvedStartTime = slot2.startTime;
  s2_ravi.approvedEndTime = slot2.endTime;
  await s2_ravi.save();

  // Update slot2 approved count
  await Slot.findByIdAndUpdate(slot1._id, { approvedCount: 1 });
  await Slot.findByIdAndUpdate(slot2._id, { approvedCount: 1 });

  // Slot 1: Priya also signed up (pending)
  await Signup.create({ slot: slot1._id, employee: priya._id, status: 'pending' });

  // Slot 1: Kiran signed up (pending)
  await Signup.create({ slot: slot1._id, employee: kiran._id, status: 'pending' });

  // Slot 3: Ravi signed up — BR-6 scenario: 9h + 4h = 13h > 12h cap
  // Manager approval attempt will be rejected by the service
  await Signup.create({ slot: slot3._id, employee: ravi._id, status: 'pending' });

  // Assembly signups
  const s4_anita = await Signup.create({ slot: slot4._id, employee: anita._id, status: 'pending' });
  s4_anita.status = 'approved';
  s4_anita.decidedBy = assemblyManager._id;
  s4_anita.decidedAt = new Date();
  s4_anita.approvedStartTime = slot4.startTime;
  s4_anita.approvedEndTime = slot4.endTime;
  await s4_anita.save();

  await Signup.create({ slot: slot4._id, employee: deepak._id, status: 'pending' });
  await Slot.findByIdAndUpdate(slot4._id, { approvedCount: 1 });

  console.log('✅ Seed complete!\n');
  console.log('═══════════════════════════════════════════════════');
  console.log('  Seeded Login Credentials');
  console.log('═══════════════════════════════════════════════════');
  console.log('  Admin:    admin@sundar.com           / Admin@1234');
  console.log('  Manager1: manager.machining@sundar.com / Manager@1234  [Machining]');
  console.log('  Manager2: manager.assembly@sundar.com  / Manager@1234  [Assembly]');
  console.log('  Employee: ravi@sundar.com            / Employee@1234  [Machining, cap 12h]');
  console.log('  Employee: priya.employee@sundar.com  / Employee@1234  [Machining]');
  console.log('  Employee: anita@sundar.com           / Employee@1234  [Assembly]');
  console.log('  Employee: meena@sundar.com           / Employee@1234  [Assembly, cap 8h]');
  console.log('═══════════════════════════════════════════════════');
  console.log('  BR-6 test: Approve ravi@sundar.com for slot3 (Quality Inspection Prep)');
  console.log('             9h already this week + 4h = 13h > 12h cap → should be rejected');
  console.log('═══════════════════════════════════════════════════');

  await mongoose.connection.close();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
