require('./setup');
const request = require('supertest');
const app = require('../src/app');
const { User } = require('../src/models/User');
const jwt = require('jsonwebtoken');

const makeToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET || 'test_secret', { expiresIn: '1h' });

const createUser = async (overrides = {}) => {
  const user = await User.create({
    name: 'User',
    email: `u${Date.now()}@example.com`,
    password: 'password123',
    role: 'employee',
    department: 'Machining',
    ...overrides,
  });
  return { user, token: makeToken(user._id) };
};

describe('Role-based access control', () => {
  test('employee cannot access admin-only /api/users POST', async () => {
    const { token } = await createUser({ role: 'employee' });

    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'X', email: 'x@x.com', password: 'abc123', role: 'employee', department: 'Assembly' });

    expect(res.status).toBe(403);
  });

  test('manager cannot access admin-only /api/users POST', async () => {
    const { token } = await createUser({ role: 'manager', department: 'Assembly' });

    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Y', email: 'y@y.com', password: 'abc123', role: 'employee', department: 'Assembly' });

    expect(res.status).toBe(403);
  });

  test('employee cannot create a slot', async () => {
    const { token } = await createUser({ role: 'employee' });
    const futureDate = new Date(Date.now() + 86400000).toISOString().substring(0, 10);

    const res = await request(app)
      .post('/api/slots')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Test Slot',
        department: 'Machining',
        date: futureDate,
        startTime: new Date(Date.now() + 86400000).toISOString(),
        endTime: new Date(Date.now() + 86400000 + 7200000).toISOString(),
        headcountRequired: 2,
      });

    expect(res.status).toBe(403);
  });

  test('unauthenticated request returns 401', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});
