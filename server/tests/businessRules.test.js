require('./setup');
const request = require('supertest');
const app = require('../src/app');
const { User } = require('../src/models/User');
const { Slot } = require('../src/models/Slot');
const { Signup } = require('../src/models/Signup');
const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'test_secret';
const makeToken = (id) => jwt.sign({ id }, SECRET, { expiresIn: '1h' });

// Helpers
const futureISO = (daysFromNow, hour = 10) => {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  const dateStr = d.toISOString().substring(0, 10);
  const [y, m, day] = dateStr.split('-').map(Number);
  const utcHour = hour - 5;
  const utcMin = -30;
  return new Date(Date.UTC(y, m - 1, day, utcHour, utcMin < 0 ? utcMin + 60 : utcMin)).toISOString();
};

const futureDateStr = (daysFromNow) => {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().substring(0, 10);
};

let manager, employee1, employee2, managerToken, emp1Token, emp2Token;

beforeEach(async () => {
  manager = await User.create({
    name: 'Mgr', email: `mgr${Date.now()}@t.com`, password: 'password123', role: 'manager', department: 'Machining',
  });
  employee1 = await User.create({
    name: 'Emp1', email: `emp1${Date.now()}@t.com`, password: 'password123', role: 'employee',
    department: 'Machining', weeklyOtCapHours: 12,
  });
  employee2 = await User.create({
    name: 'Emp2', email: `emp2${Date.now()}@t.com`, password: 'password123', role: 'employee',
    department: 'Machining', weeklyOtCapHours: 12,
  });
  managerToken = makeToken(manager._id);
  emp1Token = makeToken(employee1._id);
  emp2Token = makeToken(employee2._id);
});

const createSlotAndSignup = async (startOffset, endOffset) => {
  const dateStr = futureDateStr(1);
  const slot = await Slot.create({
    title: 'Test Slot',
    department: 'Machining',
    date: dateStr,
    startTime: futureISO(1, startOffset),
    endTime: futureISO(1, endOffset),
    headcountRequired: 1,
    createdBy: manager._id,
  });
  const signup = await Signup.create({ slot: slot._id, employee: employee1._id });
  return { slot, signup };
};

describe('BR-4: Headcount limit', () => {
  test('rejects approval when headcount already reached', async () => {
    const dateStr = futureDateStr(1);
    const slot = await Slot.create({
      title: 'Headcount Slot',
      department: 'Machining',
      date: dateStr,
      startTime: futureISO(1, 18),
      endTime: futureISO(1, 20),
      headcountRequired: 1,
      createdBy: manager._id,
      approvedCount: 1,
      status: 'filled',
    });

    const signup2 = await Signup.create({ slot: slot._id, employee: employee2._id });

    const res = await request(app)
      .patch(`/api/signups/${signup2._id}/decision`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ decision: 'approved' });

    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/headcount/i);
  });
});

describe('BR-5: Overlap rejection', () => {
  test('rejects approval when employee has overlapping approved slot', async () => {
    const dateStr = futureDateStr(1);

    // Slot X: 18:00 – 21:00
    const slotX = await Slot.create({
      title: 'Slot X', department: 'Machining', date: dateStr,
      startTime: futureISO(1, 18), endTime: futureISO(1, 21),
      headcountRequired: 2, createdBy: manager._id,
    });
    // Approve employee1 for Slot X
    const signupX = await Signup.create({ slot: slotX._id, employee: employee1._id });
    signupX.status = 'approved';
    signupX.approvedStartTime = slotX.startTime;
    signupX.approvedEndTime = slotX.endTime;
    await signupX.save();
    await Slot.findByIdAndUpdate(slotX._id, { approvedCount: 1 });

    // Slot Y: 20:00 – 22:00 (overlaps X)
    const slotY = await Slot.create({
      title: 'Slot Y', department: 'Machining', date: dateStr,
      startTime: futureISO(1, 20), endTime: futureISO(1, 22),
      headcountRequired: 2, createdBy: manager._id,
    });
    const signupY = await Signup.create({ slot: slotY._id, employee: employee1._id });

    const res = await request(app)
      .patch(`/api/signups/${signupY._id}/decision`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ decision: 'approved' });

    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/overlap/i);
  });
});

describe('BR-6: Weekly cap', () => {
  test('rejects approval when it would breach weekly cap', async () => {
    const dateStr1 = futureDateStr(1);
    const dateStr2 = futureDateStr(2);

    // Give employee1 10h of approved OT this week
    const slotA = await Slot.create({
      title: 'Mon Slot', department: 'Machining', date: dateStr1,
      startTime: futureISO(1, 8), endTime: futureISO(1, 14), // 6h
      headcountRequired: 2, createdBy: manager._id,
    });
    const slotB = await Slot.create({
      title: 'Tue Slot', department: 'Machining', date: dateStr1,
      startTime: futureISO(1, 15), endTime: futureISO(1, 19), // 4h
      headcountRequired: 2, createdBy: manager._id,
    });

    for (const slot of [slotA, slotB]) {
      const s = await Signup.create({ slot: slot._id, employee: employee1._id });
      s.status = 'approved';
      s.approvedStartTime = slot.startTime;
      s.approvedEndTime = slot.endTime;
      await s.save();
    }

    // Now try to approve a 4h slot — total would be 14h > 12h cap
    const slotC = await Slot.create({
      title: 'Cap Breaker', department: 'Machining', date: dateStr2,
      startTime: futureISO(2, 18), endTime: futureISO(2, 22), // 4h
      headcountRequired: 2, createdBy: manager._id,
    });
    const signupC = await Signup.create({ slot: slotC._id, employee: employee1._id });

    const res = await request(app)
      .patch(`/api/signups/${signupC._id}/decision`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ decision: 'approved' });

    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/cap/i);
  });
});
