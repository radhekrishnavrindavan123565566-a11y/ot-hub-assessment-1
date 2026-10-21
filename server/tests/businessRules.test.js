require('./setup');
const request = require('supertest');
const app = require('../src/app');
const { User } = require('../src/models/User');
const { Slot } = require('../src/models/Slot');
const { Signup } = require('../src/models/Signup');
const { AuditLog } = require('../src/models/AuditLog');
const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'test_secret';
const makeToken = (id) => jwt.sign({ id }, SECRET, { expiresIn: '1h' });

// ── Time helpers ────────────────────────────────────────────────────────────
// futureISO: returns a UTC ISO string for (now + daysFromNow days) at the given
// IST hour, ensuring start/end fall in the same IST week to avoid BR-6 flakiness.
const futureISO = (daysFromNow, hour = 10) => {
  const base = new Date();
  base.setDate(base.getDate() + daysFromNow);
  const dateStr = base.toISOString().substring(0, 10);
  const [y, m, d] = dateStr.split('-').map(Number);
  let utcH = hour - 5;
  let utcM = -30;
  if (utcM < 0) { utcM += 60; utcH -= 1; }
  return new Date(Date.UTC(y, m - 1, d, utcH, utcM)).toISOString();
};

const futureDateStr = (daysFromNow) => {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().substring(0, 10);
};

// ── Shared fixtures ──────────────────────────────────────────────────────────
let manager, manager2, employee1, employee2, admin;
let managerToken, manager2Token, emp1Token, emp2Token, adminToken;

beforeEach(async () => {
  manager = await User.create({ name: 'Mgr', email: `mgr${Date.now()}@t.com`, password: 'password123', role: 'manager', department: 'Machining' });
  manager2 = await User.create({ name: 'Mgr2', email: `mgr2${Date.now()}@t.com`, password: 'password123', role: 'manager', department: 'Assembly' });
  employee1 = await User.create({ name: 'Emp1', email: `emp1${Date.now()}@t.com`, password: 'password123', role: 'employee', department: 'Machining', weeklyOtCapHours: 12 });
  employee2 = await User.create({ name: 'Emp2', email: `emp2${Date.now()}@t.com`, password: 'password123', role: 'employee', department: 'Machining', weeklyOtCapHours: 12 });
  admin = await User.create({ name: 'Admin', email: `admin${Date.now()}@t.com`, password: 'password123', role: 'admin' });

  managerToken  = makeToken(manager._id);
  manager2Token = makeToken(manager2._id);
  emp1Token     = makeToken(employee1._id);
  emp2Token     = makeToken(employee2._id);
  adminToken    = makeToken(admin._id);
});

// ── BR-1: Slot validity ─────────────────────────────────────────────────────
describe('BR-1: Slot validity', () => {
  const validSlot = () => ({
    title: 'Test Slot',
    department: 'Machining',
    date: futureDateStr(1),
    startTime: futureISO(1, 18),
    endTime: futureISO(1, 21),
    headcountRequired: 2,
  });

  test('creates a valid slot', async () => {
    const res = await request(app).post('/api/slots').set('Authorization', `Bearer ${managerToken}`).send(validSlot());
    expect(res.status).toBe(201);
    expect(res.body.data.slot.title).toBe('Test Slot');
  });

  test('rejects slot in the past', async () => {
    const slot = { ...validSlot(), startTime: new Date(Date.now() - 3600000).toISOString(), endTime: new Date(Date.now() - 1800000).toISOString() };
    const res = await request(app).post('/api/slots').set('Authorization', `Bearer ${managerToken}`).send(slot);
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/future/i);
  });

  test('rejects slot where end is before start', async () => {
    const slot = { ...validSlot(), startTime: futureISO(1, 21), endTime: futureISO(1, 18) };
    const res = await request(app).post('/api/slots').set('Authorization', `Bearer ${managerToken}`).send(slot);
    expect(res.status).toBe(400);
  });

  test('rejects slot longer than 6 hours', async () => {
    const slot = { ...validSlot(), startTime: futureISO(1, 8), endTime: futureISO(1, 15) }; // 7h
    const res = await request(app).post('/api/slots').set('Authorization', `Bearer ${managerToken}`).send(slot);
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/6 hours/i);
  });

  test('rejects slot with headcount = 0', async () => {
    const slot = { ...validSlot(), headcountRequired: 0 };
    const res = await request(app).post('/api/slots').set('Authorization', `Bearer ${managerToken}`).send(slot);
    expect(res.status).toBe(400);
  });

  test('rejects slot with headcount > 50', async () => {
    const slot = { ...validSlot(), headcountRequired: 51 };
    const res = await request(app).post('/api/slots').set('Authorization', `Bearer ${managerToken}`).send(slot);
    expect(res.status).toBe(400);
  });
});

// ── BR-2: Department scope ───────────────────────────────────────────────────
describe('BR-2: Department scope', () => {
  test('employee cannot sign up for a slot in a different department', async () => {
    const assemblySlot = await Slot.create({
      title: 'Assembly Slot', department: 'Assembly',
      date: futureDateStr(1), startTime: futureISO(1, 18), endTime: futureISO(1, 21),
      headcountRequired: 2, createdBy: manager._id,
    });

    const res = await request(app)
      .post(`/api/slots/${assemblySlot._id}/signups`)
      .set('Authorization', `Bearer ${emp1Token}`); // emp1 is Machining

    expect(res.status).toBe(403);
    expect(res.body.error.message).toMatch(/department/i);
  });

  test('manager cannot create a slot for a different department', async () => {
    // manager is in Machining; trying to specify Assembly dept → 403
    const res = await request(app)
      .post('/api/slots')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ title: 'Test', department: 'Assembly', date: futureDateStr(1), startTime: futureISO(1, 18), endTime: futureISO(1, 21), headcountRequired: 1 });

    expect(res.status).toBe(403);
    expect(res.body.error.message).toMatch(/department/i);
  });

  test('manager cannot cancel a slot in a different department', async () => {
    const machiningSlot = await Slot.create({
      title: 'Machining Slot', department: 'Machining',
      date: futureDateStr(1), startTime: futureISO(1, 18), endTime: futureISO(1, 21),
      headcountRequired: 2, createdBy: manager._id,
    });

    // manager2 is in Assembly
    const res = await request(app)
      .post(`/api/slots/${machiningSlot._id}/cancel`)
      .set('Authorization', `Bearer ${manager2Token}`);

    expect(res.status).toBe(403);
  });
});

// ── BR-3: One signup per slot ─────────────────────────────────────────────────
describe('BR-3: One signup per slot', () => {
  test('employee cannot sign up for the same slot twice', async () => {
    const slot = await Slot.create({
      title: 'Dup Slot', department: 'Machining',
      date: futureDateStr(1), startTime: futureISO(1, 18), endTime: futureISO(1, 20),
      headcountRequired: 3, createdBy: manager._id,
    });

    // First signup succeeds
    const res1 = await request(app).post(`/api/slots/${slot._id}/signups`).set('Authorization', `Bearer ${emp1Token}`);
    expect(res1.status).toBe(201);

    // Second signup fails
    const res2 = await request(app).post(`/api/slots/${slot._id}/signups`).set('Authorization', `Bearer ${emp1Token}`);
    expect(res2.status).toBe(409);
    expect(res2.body.error.message).toMatch(/already have/i);
  });

  test('BR-3 audit: signup_created is logged', async () => {
    const slot = await Slot.create({
      title: 'Audit Slot', department: 'Machining',
      date: futureDateStr(1), startTime: futureISO(1, 18), endTime: futureISO(1, 20),
      headcountRequired: 2, createdBy: manager._id,
    });
    await request(app).post(`/api/slots/${slot._id}/signups`).set('Authorization', `Bearer ${emp1Token}`);
    const log = await AuditLog.findOne({ action: 'signup_created', targetSlot: slot._id });
    expect(log).not.toBeNull();
  });
});

// ── BR-4: Headcount limit ─────────────────────────────────────────────────────
describe('BR-4: Headcount limit', () => {
  test('rejects approval when headcount already reached', async () => {
    const slot = await Slot.create({
      title: 'Full Slot', department: 'Machining', date: futureDateStr(1),
      startTime: futureISO(1, 18), endTime: futureISO(1, 20),
      headcountRequired: 1, approvedCount: 1, status: 'filled', createdBy: manager._id,
    });

    const signup2 = await Signup.create({ slot: slot._id, employee: employee2._id });
    const res = await request(app)
      .patch(`/api/signups/${signup2._id}/decision`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ decision: 'approved' });

    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/headcount/i);
  });

  test('slot status becomes filled when headcount is reached', async () => {
    const slot = await Slot.create({
      title: 'Fill Test', department: 'Machining', date: futureDateStr(1),
      startTime: futureISO(1, 18), endTime: futureISO(1, 20),
      headcountRequired: 1, createdBy: manager._id,
    });
    const signup = await Signup.create({ slot: slot._id, employee: employee1._id });

    await request(app)
      .patch(`/api/signups/${signup._id}/decision`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ decision: 'approved' });

    const updatedSlot = await Slot.findById(slot._id);
    expect(updatedSlot.status).toBe('filled');
    expect(updatedSlot.approvedCount).toBe(1);
  });
});

// ── BR-5: No overlap ─────────────────────────────────────────────────────────
describe('BR-5: Overlap rejection', () => {
  test('rejects approval when employee has overlapping approved slot', async () => {
    const dateStr = futureDateStr(1);
    const slotX = await Slot.create({
      title: 'Slot X', department: 'Machining', date: dateStr,
      startTime: futureISO(1, 18), endTime: futureISO(1, 21), headcountRequired: 2, createdBy: manager._id,
    });
    const signupX = await Signup.create({ slot: slotX._id, employee: employee1._id });
    signupX.status = 'approved';
    signupX.approvedStartTime = slotX.startTime;
    signupX.approvedEndTime = slotX.endTime;
    await signupX.save();
    await Slot.findByIdAndUpdate(slotX._id, { approvedCount: 1 });

    const slotY = await Slot.create({
      title: 'Slot Y', department: 'Machining', date: dateStr,
      startTime: futureISO(1, 20), endTime: futureISO(1, 22), headcountRequired: 2, createdBy: manager._id,
    });
    const signupY = await Signup.create({ slot: slotY._id, employee: employee1._id });

    const res = await request(app)
      .patch(`/api/signups/${signupY._id}/decision`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ decision: 'approved' });

    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/overlap/i);
  });

  test('allows approval when slots only touch (no actual overlap)', async () => {
    const dateStr = futureDateStr(1);
    // Slot A: 18:00–20:00, Slot B: 20:00–22:00 — touching is OK per BR-5
    const slotA = await Slot.create({
      title: 'Slot A', department: 'Machining', date: dateStr,
      startTime: futureISO(1, 18), endTime: futureISO(1, 20), headcountRequired: 2, createdBy: manager._id,
    });
    const signupA = await Signup.create({ slot: slotA._id, employee: employee1._id });
    signupA.status = 'approved';
    signupA.approvedStartTime = slotA.startTime;
    signupA.approvedEndTime = slotA.endTime;
    await signupA.save();
    await Slot.findByIdAndUpdate(slotA._id, { approvedCount: 1 });

    const slotB = await Slot.create({
      title: 'Slot B', department: 'Machining', date: dateStr,
      startTime: futureISO(1, 20), endTime: futureISO(1, 22), headcountRequired: 2, createdBy: manager._id,
    });
    const signupB = await Signup.create({ slot: slotB._id, employee: employee1._id });

    const res = await request(app)
      .patch(`/api/signups/${signupB._id}/decision`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ decision: 'approved' });

    expect(res.status).toBe(200);
    expect(res.body.data.signup.status).toBe('approved');
  });
});

// ── BR-6: Weekly cap ──────────────────────────────────────────────────────────
describe('BR-6: Weekly cap', () => {
  test('rejects approval when it would breach weekly cap', async () => {
    // Use a fixed date (next Monday) so both slots are guaranteed in the same IST week
    const getNextMonday = () => {
      const d = new Date();
      const day = d.getUTCDay(); // 0=Sun, 1=Mon...
      const daysToAdd = day === 0 ? 1 : 8 - day;
      d.setDate(d.getDate() + daysToAdd);
      return d;
    };
    const monday = getNextMonday();
    const toISO = (d, h) => {
      const ist = new Date(d.getTime());
      ist.setUTCDate(d.getUTCDate());
      const [y, m, day] = ist.toISOString().substring(0, 10).split('-').map(Number);
      let utcH = h - 5, utcM = -30;
      if (utcM < 0) { utcM += 60; utcH -= 1; }
      return new Date(Date.UTC(y, m - 1, day, utcH, utcM)).toISOString();
    };
    const mondayStr = monday.toISOString().substring(0, 10);
    const tuesdayStr = (() => { const t = new Date(monday); t.setDate(t.getDate() + 1); return t.toISOString().substring(0, 10); })();

    // Pre-approve 6h + 4h = 10h in the same week
    const slotA = await Slot.create({ title: 'A', department: 'Machining', date: mondayStr, startTime: toISO(monday, 8), endTime: toISO(monday, 14), headcountRequired: 2, createdBy: manager._id });
    const slotB = await Slot.create({ title: 'B', department: 'Machining', date: mondayStr, startTime: toISO(monday, 15), endTime: toISO(monday, 19), headcountRequired: 2, createdBy: manager._id });

    for (const s of [slotA, slotB]) {
      const sig = await Signup.create({ slot: s._id, employee: employee1._id });
      sig.status = 'approved';
      sig.approvedStartTime = s.startTime;
      sig.approvedEndTime = s.endTime;
      await sig.save();
    }

    // 4h slot on Tuesday of same week — 10 + 4 = 14h > 12h cap
    const tuesday = new Date(monday); tuesday.setDate(monday.getDate() + 1);
    const slotC = await Slot.create({ title: 'C', department: 'Machining', date: tuesdayStr, startTime: toISO(tuesday, 18), endTime: toISO(tuesday, 22), headcountRequired: 2, createdBy: manager._id });
    const signupC = await Signup.create({ slot: slotC._id, employee: employee1._id });

    const res = await request(app)
      .patch(`/api/signups/${signupC._id}/decision`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ decision: 'approved' });

    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/cap/i);
  });

  test('includes the exact cap figure in the error message', async () => {
    const dateStr = futureDateStr(1);
    employee1.weeklyOtCapHours = 5;
    await employee1.save();

    // 4h pre-approved
    const slotA = await Slot.create({ title: 'A', department: 'Machining', date: dateStr, startTime: futureISO(1, 8), endTime: futureISO(1, 12), headcountRequired: 2, createdBy: manager._id });
    const sigA = await Signup.create({ slot: slotA._id, employee: employee1._id });
    sigA.status = 'approved'; sigA.approvedStartTime = slotA.startTime; sigA.approvedEndTime = slotA.endTime;
    await sigA.save();

    // 3h more would breach 5h cap
    const slotB = await Slot.create({ title: 'B', department: 'Machining', date: dateStr, startTime: futureISO(1, 14), endTime: futureISO(1, 17), headcountRequired: 2, createdBy: manager._id });
    const sigB = await Signup.create({ slot: slotB._id, employee: employee1._id });

    const res = await request(app)
      .patch(`/api/signups/${sigB._id}/decision`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ decision: 'approved' });

    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/5/); // cap is 5h
    expect(res.body.error.message).toMatch(/7/); // projected is 7h
  });
});

// ── BR-7: Withdrawal rules ────────────────────────────────────────────────────
describe('BR-7: Withdrawal', () => {
  test('employee can withdraw a pending signup at any time', async () => {
    const slot = await Slot.create({
      title: 'W Slot', department: 'Machining', date: futureDateStr(1),
      startTime: futureISO(1, 18), endTime: futureISO(1, 21), headcountRequired: 2, createdBy: manager._id,
    });
    const signup = await Signup.create({ slot: slot._id, employee: employee1._id });

    const res = await request(app)
      .delete(`/api/signups/${signup._id}`)
      .set('Authorization', `Bearer ${emp1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.signup.status).toBe('withdrawn');
  });

  test('employee can withdraw an approved signup more than 24h before start', async () => {
    const slot = await Slot.create({
      title: 'Far Slot', department: 'Machining', date: futureDateStr(3),
      startTime: futureISO(3, 18), endTime: futureISO(3, 21), headcountRequired: 2, createdBy: manager._id,
    });
    const signup = await Signup.create({ slot: slot._id, employee: employee1._id });
    signup.status = 'approved';
    signup.approvedStartTime = slot.startTime;
    signup.approvedEndTime = slot.endTime;
    await signup.save();
    await Slot.findByIdAndUpdate(slot._id, { approvedCount: 1 });

    const res = await request(app)
      .delete(`/api/signups/${signup._id}`)
      .set('Authorization', `Bearer ${emp1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.signup.status).toBe('withdrawn');
  });

  test('employee cannot withdraw an approved signup within 24h of start', async () => {
    // Slot starts in 12 hours
    const start = new Date(Date.now() + 12 * 60 * 60 * 1000);
    const end   = new Date(Date.now() + 14 * 60 * 60 * 1000);
    const dateStr = start.toISOString().substring(0, 10);

    const slot = await Slot.create({
      title: 'Soon Slot', department: 'Machining', date: dateStr,
      startTime: start, endTime: end, headcountRequired: 2, createdBy: manager._id,
    });
    const signup = await Signup.create({ slot: slot._id, employee: employee1._id });
    signup.status = 'approved';
    signup.approvedStartTime = start;
    signup.approvedEndTime = end;
    await signup.save();

    const res = await request(app)
      .delete(`/api/signups/${signup._id}`)
      .set('Authorization', `Bearer ${emp1Token}`);

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/24/);
  });

  test('employee cannot withdraw another employee\'s signup', async () => {
    const slot = await Slot.create({
      title: 'Other Slot', department: 'Machining', date: futureDateStr(2),
      startTime: futureISO(2, 18), endTime: futureISO(2, 21), headcountRequired: 2, createdBy: manager._id,
    });
    const signup = await Signup.create({ slot: slot._id, employee: employee1._id });

    const res = await request(app)
      .delete(`/api/signups/${signup._id}`)
      .set('Authorization', `Bearer ${emp2Token}`); // emp2 trying to delete emp1's signup

    expect(res.status).toBe(403);
  });

  test('slot becomes open again when approved person withdraws', async () => {
    const slot = await Slot.create({
      title: 'Reopen Slot', department: 'Machining', date: futureDateStr(3),
      startTime: futureISO(3, 18), endTime: futureISO(3, 21),
      headcountRequired: 1, approvedCount: 1, status: 'filled', createdBy: manager._id,
    });
    const signup = await Signup.create({ slot: slot._id, employee: employee1._id });
    signup.status = 'approved';
    signup.approvedStartTime = slot.startTime;
    signup.approvedEndTime = slot.endTime;
    await signup.save();

    await request(app).delete(`/api/signups/${signup._id}`).set('Authorization', `Bearer ${emp1Token}`);

    const updatedSlot = await Slot.findById(slot._id);
    expect(updatedSlot.status).toBe('open');
    expect(updatedSlot.approvedCount).toBe(0);
  });
});

// ── BR-8: Editing with approved signups ──────────────────────────────────────
describe('BR-8: Slot editing', () => {
  test('manager can edit slot title and headcount even with approved signups', async () => {
    const slot = await Slot.create({
      title: 'Old Title', department: 'Machining', date: futureDateStr(2),
      startTime: futureISO(2, 18), endTime: futureISO(2, 21), headcountRequired: 2, createdBy: manager._id,
    });
    await Signup.create({ slot: slot._id, employee: employee1._id, status: 'approved', approvedStartTime: slot.startTime, approvedEndTime: slot.endTime });

    const res = await request(app)
      .patch(`/api/slots/${slot._id}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ title: 'New Title', headcountRequired: 3 });

    expect(res.status).toBe(200);
    expect(res.body.data.slot.title).toBe('New Title');
    expect(res.body.data.slot.headcountRequired).toBe(3);
  });

  test('manager cannot change date/time when approved signups exist', async () => {
    const slot = await Slot.create({
      title: 'Locked Slot', department: 'Machining', date: futureDateStr(2),
      startTime: futureISO(2, 18), endTime: futureISO(2, 21), headcountRequired: 2, createdBy: manager._id,
    });
    await Signup.create({ slot: slot._id, employee: employee1._id, status: 'approved', approvedStartTime: slot.startTime, approvedEndTime: slot.endTime });

    const res = await request(app)
      .patch(`/api/slots/${slot._id}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ date: futureDateStr(3), startTime: futureISO(3, 18), endTime: futureISO(3, 21) });

    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/BR-8/i);
  });

  test('manager can change date/time when only pending signups exist', async () => {
    const slot = await Slot.create({
      title: 'Pending Slot', department: 'Machining', date: futureDateStr(2),
      startTime: futureISO(2, 18), endTime: futureISO(2, 21), headcountRequired: 2, createdBy: manager._id,
    });
    await Signup.create({ slot: slot._id, employee: employee1._id, status: 'pending' });

    const res = await request(app)
      .patch(`/api/slots/${slot._id}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ date: futureDateStr(3), startTime: futureISO(3, 18), endTime: futureISO(3, 21) });

    expect(res.status).toBe(200);
    expect(res.body.data.slot.date).toBe(futureDateStr(3));
  });
});

// ── BR-9: Audit trail ────────────────────────────────────────────────────────
describe('BR-9: Audit trail', () => {
  test('slot_created is logged when a slot is created', async () => {
    await request(app).post('/api/slots').set('Authorization', `Bearer ${managerToken}`)
      .send({ title: 'Audit', department: 'Machining', date: futureDateStr(1), startTime: futureISO(1, 18), endTime: futureISO(1, 21), headcountRequired: 2 });
    const log = await AuditLog.findOne({ action: 'slot_created', performedBy: manager._id });
    expect(log).not.toBeNull();
  });

  test('signup_approved is logged on approval', async () => {
    const slot = await Slot.create({ title: 'A', department: 'Machining', date: futureDateStr(1), startTime: futureISO(1, 18), endTime: futureISO(1, 21), headcountRequired: 2, createdBy: manager._id });
    const signup = await Signup.create({ slot: slot._id, employee: employee1._id });
    await request(app).patch(`/api/signups/${signup._id}/decision`).set('Authorization', `Bearer ${managerToken}`).send({ decision: 'approved' });
    const log = await AuditLog.findOne({ action: 'signup_approved' });
    expect(log).not.toBeNull();
    expect(log.performedBy.toString()).toBe(manager._id.toString());
  });

  test('ot_cap_changed is logged when admin changes cap', async () => {
    await request(app).patch(`/api/users/${employee1._id}/ot-cap`).set('Authorization', `Bearer ${adminToken}`).send({ weeklyOtCapHours: 8 });
    const log = await AuditLog.findOne({ action: 'ot_cap_changed', targetUser: employee1._id });
    expect(log).not.toBeNull();
    expect(log.previousValue.weeklyOtCapHours).toBe(12);
    expect(log.newValue.weeklyOtCapHours).toBe(8);
  });
});
