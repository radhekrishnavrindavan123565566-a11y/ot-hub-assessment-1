require('./setup');
const request = require('supertest');
const app = require('../src/app');
const { User } = require('../src/models/User');

// Helpers
const createUser = (overrides = {}) =>
  User.create({
    name: 'Test User',
    email: 'test@example.com',
    password: 'password123',
    role: 'employee',
    department: 'Machining',
    ...overrides,
  });

describe('POST /api/auth/login', () => {
  test('returns JWT on valid credentials', async () => {
    await createUser({ email: 'valid@example.com', password: 'pass123' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'valid@example.com', password: 'pass123' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.password).toBeUndefined(); // password never returned
  });

  test('returns 401 on wrong password', async () => {
    await createUser({ email: 'user2@example.com', password: 'realpass' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user2@example.com', password: 'wrongpass' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('returns 401 for unknown email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'somepass' });

    expect(res.status).toBe(401);
  });

  test('returns 400 on missing fields', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'x@x.com' });
    expect(res.status).toBe(400);
  });
});
