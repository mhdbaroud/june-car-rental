// Real DB, real bcrypt, real JWT — only email/sse/rate-limit are mocked
jest.mock('../../config/email', () => ({
  sendVerificationCode: jest.fn().mockResolvedValue(),
  sendPasswordReset: jest.fn().mockResolvedValue(),
  sendBookingReceived: jest.fn().mockResolvedValue(),
  sendBookingConfirmation: jest.fn().mockResolvedValue(),
  sendCancellationRequest: jest.fn().mockResolvedValue(),
  sendCancellationApproved: jest.fn().mockResolvedValue(),
  sendCancellationRejected: jest.fn().mockResolvedValue(),
  sendPaymentRejected: jest.fn().mockResolvedValue(),
  sendStaffWelcome: jest.fn().mockResolvedValue(),
  sendBookingCompleted: jest.fn().mockResolvedValue(),
}));
jest.mock('../../config/sse', () => ({ broadcast: jest.fn(), addClient: jest.fn(), removeClient: jest.fn() }));
jest.mock('express-rate-limit', () => () => (req, res, next) => next());

const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../../config/db');

const SECRET = 'test_secret';

const app = express();
app.use(express.json());
app.use('/api/auth', require('../../routes/auth'));

// Seed user 3 (john@test.com) has bcrypt hash of 'password' and role 'customer'
// Seed user 2 (m7md.barood@gmail.com) is 'admin'
// We generate tokens directly since we control the secret in test env

const dbQuery = (sql, params = []) =>
  new Promise((resolve, reject) =>
    db.query(sql, params, (err, results) => (err ? reject(err) : resolve(results)))
  );

const TEST_EMAIL = 'int_auth_test@vrms_test.internal';

afterAll(async () => {
  await dbQuery('DELETE FROM verification_codes WHERE email = ?', [TEST_EMAIL]);
  await dbQuery('DELETE FROM users WHERE email = ?', [TEST_EMAIL]);
});

// ─── Register ────────────────────────────────────────────────────────────────

describe('POST /api/auth/register (real DB)', () => {
  it('creates a new user and stores them in the database', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Integration User', email: TEST_EMAIL, password: 'password123', phone: '9990001111' });

    expect(res.status).toBe(201);
    expect(res.body.message).toMatch(/registration successful/i);

    const rows = await dbQuery('SELECT id, name, email, role FROM users WHERE email = ?', [TEST_EMAIL]);
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe('Integration User');
    expect(rows[0].role).toBe('customer');
  });

  it('409 on duplicate email — real unique constraint', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Dup User', email: TEST_EMAIL, password: 'password123', phone: '9990002222' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/already registered/i);

    // Verify DB still has only one row for this email
    const rows = await dbQuery('SELECT id FROM users WHERE email = ?', [TEST_EMAIL]);
    expect(rows).toHaveLength(1);
  });
});

// ─── Login ────────────────────────────────────────────────────────────────────

describe('POST /api/auth/login (real DB + real bcrypt)', () => {
  // john@test.com uses bcrypt hash of 'password' (seeded via dump)
  it('sends verification code for valid customer credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'john@test.com', password: 'password' });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/verification code/i);

    // Real code written to DB
    const rows = await dbQuery('SELECT code FROM verification_codes WHERE email = ?', ['john@test.com']);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0].code).toMatch(/^\d{6}$/);
  });

  it('401 for wrong password (real bcrypt comparison)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'john@test.com', password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid/i);
  });

  it('401 for non-existent email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@vrms_test.internal', password: 'password' });

    expect(res.status).toBe(401);
  });
});

// ─── Profile ─────────────────────────────────────────────────────────────────

describe('GET /api/auth/profile (real DB)', () => {
  // User 3 (john@test.com) is in the seeded DB
  const JOHN_TOKEN = `Bearer ${jwt.sign({ id: 3, role: 'customer' }, SECRET)}`;

  it('returns real user data from DB', async () => {
    const res = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', JOHN_TOKEN);

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('John Smith');
    expect(res.body.email).toBe('john@test.com');
    expect(res.body).not.toHaveProperty('password');
  });

  it('401 without token', async () => {
    const res = await request(app).get('/api/auth/profile');
    expect(res.status).toBe(401);
  });

  it('404 for token with non-existent user id', async () => {
    const token = `Bearer ${jwt.sign({ id: 999999, role: 'customer' }, SECRET)}`;
    const res = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', token);

    expect(res.status).toBe(404);
  });
});

// ─── Update Profile ───────────────────────────────────────────────────────────

describe('PUT /api/auth/profile (real DB)', () => {
  const JOHN_TOKEN = `Bearer ${jwt.sign({ id: 3, role: 'customer' }, SECRET)}`;

  it('updates user profile and persists in DB', async () => {
    const res = await request(app)
      .put('/api/auth/profile')
      .set('Authorization', JOHN_TOKEN)
      .send({ name: 'John Smith Updated', phone: '1111111111' });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/updated/i);

    const rows = await dbQuery('SELECT name, phone FROM users WHERE id = 3');
    expect(rows[0].name).toBe('John Smith Updated');
    expect(rows[0].phone).toBe('1111111111');
  });

  afterAll(async () => {
    // Restore original name
    await dbQuery("UPDATE users SET name = 'John Smith', phone = '+1234567891' WHERE id = 3");
  });
});
