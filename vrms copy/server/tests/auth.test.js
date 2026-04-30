jest.mock('../config/db', () => ({ query: jest.fn() }));
jest.mock('../config/email', () => ({
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
jest.mock('../config/sse', () => ({
  broadcast: jest.fn(),
  addClient: jest.fn(),
  removeClient: jest.fn(),
}));
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('$hashed'),
  compare: jest.fn().mockResolvedValue(true),
  hashSync: jest.fn().mockReturnValue('$hashed'),
  compareSync: jest.fn().mockReturnValue(false),
}));
jest.mock('express-rate-limit', () => () => (req, res, next) => next());

const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const bcrypt = require('bcryptjs');
const email = require('../config/email');

const SECRET = 'test_secret';
const CUSTOMER_TOKEN = `Bearer ${jwt.sign({ id: 1, role: 'customer' }, SECRET)}`;

const app = express();
app.use(express.json());
app.use('/api/auth', require('../routes/auth'));

// Helper: call callback with given results (handles 2-arg and 3-arg forms)
const q = (result, err = null) => (sql, p, cb) => {
  const fn = typeof p === 'function' ? p : cb;
  if (fn) fn(err, result);
};
const qErr = (msg = 'DB error') => q(null, new Error(msg));
const qNoop = () => {};

beforeEach(() => {
  jest.resetAllMocks();
  db.query.mockImplementation(q([]));
  bcrypt.hash.mockResolvedValue('$hashed');
  bcrypt.compare.mockResolvedValue(true);
  bcrypt.hashSync.mockReturnValue('$hashed');
  bcrypt.compareSync.mockReturnValue(false);
  email.sendVerificationCode.mockResolvedValue();
  email.sendPasswordReset.mockResolvedValue();
  email.sendBookingReceived.mockResolvedValue();
  email.sendBookingConfirmation.mockResolvedValue();
  email.sendCancellationRequest.mockResolvedValue();
  email.sendCancellationApproved.mockResolvedValue();
  email.sendCancellationRejected.mockResolvedValue();
  email.sendPaymentRejected.mockResolvedValue();
  email.sendStaffWelcome.mockResolvedValue();
  email.sendBookingCompleted.mockResolvedValue();
});

// ─── Register ────────────────────────────────────────────────────────────────

describe('POST /api/auth/register', () => {
  it('201 on successful registration', async () => {
    db.query
      .mockImplementationOnce(q([]))                    // SELECT: no existing
      .mockImplementationOnce(q({ insertId: 1 }));      // INSERT user

    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'John', email: 'john@test.com', password: 'password123' });

    expect(res.status).toBe(201);
    expect(res.body.message).toMatch(/registration successful/i);
  });

  it('400 when name is missing', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'john@test.com', password: 'password123' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/required/i);
  });

  it('400 when email is missing', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'John', password: 'password123' });
    expect(res.status).toBe(400);
  });

  it('400 when password missing', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'John', email: 'john@test.com' });
    expect(res.status).toBe(400);
  });

  it('400 when password too short', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'John', email: 'john@test.com', password: 'abc' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/8 characters/i);
  });

  it('400 when email already registered', async () => {
    db.query.mockImplementationOnce(q([{ id: 1 }])); // email found

    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'John', email: 'john@test.com', password: 'password123' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Email already registered');
  });

  it('500 on database SELECT error', async () => {
    db.query.mockImplementationOnce(qErr());

    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'John', email: 'john@test.com', password: 'password123' });
    expect(res.status).toBe(500);
  });

  it('500 on database INSERT error', async () => {
    db.query
      .mockImplementationOnce(q([]))       // SELECT ok
      .mockImplementationOnce(qErr());     // INSERT fails

    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'John', email: 'john@test.com', password: 'password123' });
    expect(res.status).toBe(500);
  });

  it('registers with optional fields (phone, dob, city)', async () => {
    db.query
      .mockImplementationOnce(q([]))
      .mockImplementationOnce(q({ insertId: 2 }));

    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Jane', email: 'jane@test.com', password: 'password123',
        phone: '555-0000', date_of_birth: '1990-01-01', city: 'NYC'
      });
    expect(res.status).toBe(201);
  });
});

// ─── Login ───────────────────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
  const user = {
    id: 1, name: 'John', email: 'john@test.com',
    password_hash: '$hashed', role: 'customer', phone: null, status: 'active'
  };

  it('sends verification code to customer', async () => {
    db.query
      .mockImplementationOnce(q([user]))            // SELECT user
      .mockImplementationOnce(q({}))                // DELETE old codes
      .mockImplementationOnce(q({ insertId: 1 }));  // INSERT code

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'john@test.com', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/verification code/i);
    expect(res.body.email).toBe('john@test.com');
    expect(email.sendVerificationCode).toHaveBeenCalledTimes(1);
  });

  it('returns JWT directly for admin', async () => {
    db.query.mockImplementationOnce(q([{ ...user, role: 'admin' }]));

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'john@test.com', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.role).toBe('admin');
  });

  it('returns JWT directly for shop_worker', async () => {
    db.query.mockImplementationOnce(q([{ ...user, role: 'shop_worker' }]));

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'john@test.com', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it('returns JWT directly for call_center', async () => {
    db.query.mockImplementationOnce(q([{ ...user, role: 'call_center' }]));

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'john@test.com', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it('400 when email missing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ password: 'password123' });
    expect(res.status).toBe(400);
  });

  it('400 when password missing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'john@test.com' });
    expect(res.status).toBe(400);
  });

  it('401 when user not found', async () => {
    db.query.mockImplementationOnce(q([]));

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@test.com', password: 'password123' });

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid email or password/i);
  });

  it('401 when password is incorrect', async () => {
    db.query.mockImplementationOnce(q([user]));
    bcrypt.compare.mockResolvedValueOnce(false);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'john@test.com', password: 'wrongpass' });

    expect(res.status).toBe(401);
  });

  it('403 for suspended account', async () => {
    db.query.mockImplementationOnce(q([{ ...user, status: 'suspended' }]));

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'john@test.com', password: 'password123' });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/suspended/i);
  });

  it('500 on database error', async () => {
    db.query.mockImplementationOnce(qErr());

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'john@test.com', password: 'password123' });

    expect(res.status).toBe(500);
  });
});

// ─── Verify Code ─────────────────────────────────────────────────────────────

describe('POST /api/auth/verify-code', () => {
  const record = { code: '123456', expires_at: Date.now() + 60000, user_id: 1 };
  const user = { id: 1, name: 'John', email: 'john@test.com', role: 'customer', phone: null };

  it('returns JWT on valid code', async () => {
    db.query
      .mockImplementationOnce(q([record])) // SELECT vcodes
      .mockImplementationOnce(qNoop)       // DELETE vcodes (no cb)
      .mockImplementationOnce(q([user]));  // SELECT user

    const res = await request(app)
      .post('/api/auth/verify-code')
      .send({ email: 'john@test.com', code: '123456' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.id).toBe(1);
  });

  it('400 when no code found', async () => {
    db.query.mockImplementationOnce(q([]));

    const res = await request(app)
      .post('/api/auth/verify-code')
      .send({ email: 'john@test.com', code: '123456' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/no verification code/i);
  });

  it('400 when code is expired', async () => {
    const expired = { ...record, expires_at: Date.now() - 1000 };
    db.query
      .mockImplementationOnce(q([expired]))
      .mockImplementationOnce(qNoop); // DELETE expired code

    const res = await request(app)
      .post('/api/auth/verify-code')
      .send({ email: 'john@test.com', code: '123456' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/expired/i);
  });

  it('400 when code does not match', async () => {
    db.query.mockImplementationOnce(q([record]));

    const res = await request(app)
      .post('/api/auth/verify-code')
      .send({ email: 'john@test.com', code: '999999' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Invalid verification code');
  });

  it('500 on database error', async () => {
    db.query.mockImplementationOnce(qErr());

    const res = await request(app)
      .post('/api/auth/verify-code')
      .send({ email: 'john@test.com', code: '123456' });

    expect(res.status).toBe(500);
  });
});

// ─── Get Profile ─────────────────────────────────────────────────────────────

describe('GET /api/auth/profile', () => {
  const user = { id: 1, name: 'John', email: 'john@test.com', role: 'customer' };

  it('returns profile for authenticated user', async () => {
    db.query.mockImplementationOnce(q([user]));

    const res = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', CUSTOMER_TOKEN);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(1);
    expect(res.body.email).toBe('john@test.com');
  });

  it('401 without token', async () => {
    const res = await request(app).get('/api/auth/profile');
    expect(res.status).toBe(401);
  });

  it('401 with invalid token', async () => {
    const res = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', 'Bearer invalid.token.here');
    expect(res.status).toBe(401);
  });

  it('404 when user not found in database', async () => {
    db.query.mockImplementationOnce(q([]));

    const res = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', CUSTOMER_TOKEN);

    expect(res.status).toBe(404);
  });

  it('500 on database error', async () => {
    db.query.mockImplementationOnce(qErr());

    const res = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', CUSTOMER_TOKEN);

    expect(res.status).toBe(500);
  });
});

// ─── Update Profile ───────────────────────────────────────────────────────────

describe('PUT /api/auth/profile', () => {
  it('updates profile successfully', async () => {
    db.query.mockImplementationOnce(q({ affectedRows: 1 }));

    const res = await request(app)
      .put('/api/auth/profile')
      .set('Authorization', CUSTOMER_TOKEN)
      .send({ name: 'John Updated', phone: '555-0000', city: 'NYC' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Profile updated successfully');
  });

  it('401 without token', async () => {
    const res = await request(app)
      .put('/api/auth/profile')
      .send({ name: 'Test' });
    expect(res.status).toBe(401);
  });

  it('500 on database error', async () => {
    db.query.mockImplementationOnce(qErr());

    const res = await request(app)
      .put('/api/auth/profile')
      .set('Authorization', CUSTOMER_TOKEN)
      .send({ name: 'John' });

    expect(res.status).toBe(500);
  });
});

// ─── Change Password ──────────────────────────────────────────────────────────

describe('PUT /api/auth/change-password', () => {
  const user = { id: 1, email: 'john@test.com', password_hash: '$hashed' };

  it('changes password successfully', async () => {
    db.query
      .mockImplementationOnce(q([user]))  // SELECT user
      .mockImplementationOnce(q([]))      // SELECT password_history (empty)
      .mockImplementationOnce(qNoop)      // INSERT history (no cb)
      .mockImplementationOnce(q({}))      // UPDATE password
      .mockImplementationOnce(qNoop);     // DELETE old history (no cb)

    bcrypt.compare
      .mockResolvedValueOnce(true)   // current matches
      .mockResolvedValueOnce(false); // new != current

    const res = await request(app)
      .put('/api/auth/change-password')
      .set('Authorization', CUSTOMER_TOKEN)
      .send({ current_password: 'oldpass123', new_password: 'newpass456' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Password changed successfully');
  });

  it('400 when current_password missing', async () => {
    const res = await request(app)
      .put('/api/auth/change-password')
      .set('Authorization', CUSTOMER_TOKEN)
      .send({ new_password: 'newpass456' });
    expect(res.status).toBe(400);
  });

  it('400 when new_password missing', async () => {
    const res = await request(app)
      .put('/api/auth/change-password')
      .set('Authorization', CUSTOMER_TOKEN)
      .send({ current_password: 'oldpass123' });
    expect(res.status).toBe(400);
  });

  it('400 when new password too short', async () => {
    const res = await request(app)
      .put('/api/auth/change-password')
      .set('Authorization', CUSTOMER_TOKEN)
      .send({ current_password: 'oldpass123', new_password: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/8 characters/i);
  });

  it('400 when current password is incorrect', async () => {
    db.query.mockImplementationOnce(q([user]));
    bcrypt.compare.mockResolvedValueOnce(false);

    const res = await request(app)
      .put('/api/auth/change-password')
      .set('Authorization', CUSTOMER_TOKEN)
      .send({ current_password: 'wrongold', new_password: 'newpass456' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Current password is incorrect');
  });

  it('400 when new password same as current', async () => {
    db.query.mockImplementationOnce(q([user]));
    bcrypt.compare
      .mockResolvedValueOnce(true)   // current matches
      .mockResolvedValueOnce(true);  // new == current

    const res = await request(app)
      .put('/api/auth/change-password')
      .set('Authorization', CUSTOMER_TOKEN)
      .send({ current_password: 'samepass', new_password: 'samepass' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/same as your current/i);
  });

  it('400 when new password matches history', async () => {
    const history = [{ password_hash: '$old1' }, { password_hash: '$old2' }];
    db.query
      .mockImplementationOnce(q([user]))
      .mockImplementationOnce(q(history));

    bcrypt.compare
      .mockResolvedValueOnce(true)   // current matches
      .mockResolvedValueOnce(false)  // new != current
      .mockResolvedValueOnce(true);  // new matches history[0]

    const res = await request(app)
      .put('/api/auth/change-password')
      .set('Authorization', CUSTOMER_TOKEN)
      .send({ current_password: 'oldpass', new_password: 'historypass' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/last 3 passwords/i);
  });

  it('401 without token', async () => {
    const res = await request(app)
      .put('/api/auth/change-password')
      .send({ current_password: 'old', new_password: 'newpass456' });
    expect(res.status).toBe(401);
  });

  it('500 on database error fetching user', async () => {
    db.query.mockImplementationOnce(qErr());

    const res = await request(app)
      .put('/api/auth/change-password')
      .set('Authorization', CUSTOMER_TOKEN)
      .send({ current_password: 'oldpass', new_password: 'newpass456' });

    expect(res.status).toBe(500);
  });
});

// ─── Forgot Password ──────────────────────────────────────────────────────────

describe('POST /api/auth/forgot-password', () => {
  it('sends reset code successfully', async () => {
    db.query
      .mockImplementationOnce(q([{ id: 1, name: 'John' }])) // SELECT user
      .mockImplementationOnce(qNoop)                         // UPDATE old tokens (no cb)
      .mockImplementationOnce(q({ insertId: 1 }));           // INSERT token

    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'john@test.com' });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/reset code/i);
    expect(email.sendPasswordReset).toHaveBeenCalledTimes(1);
  });

  it('400 when email missing', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Email is required');
  });

  it('404 when user not found', async () => {
    db.query.mockImplementationOnce(q([]));

    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'nobody@test.com' });

    expect(res.status).toBe(404);
  });

  it('500 on database error', async () => {
    db.query.mockImplementationOnce(qErr());

    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'john@test.com' });

    expect(res.status).toBe(500);
  });
});

// ─── Reset Password ───────────────────────────────────────────────────────────

describe('POST /api/auth/reset-password', () => {
  const user = { id: 1, password_hash: '$current' };
  const tokenRecord = [{ id: 10 }];

  it('resets password successfully', async () => {
    db.query
      .mockImplementationOnce(q([user]))        // SELECT user
      .mockImplementationOnce(q(tokenRecord))   // SELECT token
      .mockImplementationOnce(q([]))            // SELECT history (empty)
      .mockImplementationOnce(qNoop)            // INSERT history (no cb)
      .mockImplementationOnce(q({}))            // UPDATE password
      .mockImplementationOnce(qNoop)            // UPDATE token as used (no cb)
      .mockImplementationOnce(qNoop);           // DELETE old history (no cb)

    bcrypt.compareSync.mockReturnValue(false); // new != current

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ email: 'john@test.com', token: '123456', new_password: 'newpassword123' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Password reset successfully');
  });

  it('400 when fields are missing', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ email: 'john@test.com' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/required/i);
  });

  it('400 when new password too short', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ email: 'john@test.com', token: '123456', new_password: 'abc' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/8 characters/i);
  });

  it('404 when user not found', async () => {
    db.query.mockImplementationOnce(q([]));

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ email: 'nobody@test.com', token: '123456', new_password: 'newpassword123' });

    expect(res.status).toBe(404);
  });

  it('400 for invalid or expired token', async () => {
    db.query
      .mockImplementationOnce(q([user]))
      .mockImplementationOnce(q([])); // no valid token

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ email: 'john@test.com', token: '000000', new_password: 'newpassword123' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid or expired/i);
  });

  it('400 when new password same as current', async () => {
    db.query
      .mockImplementationOnce(q([user]))
      .mockImplementationOnce(q(tokenRecord));

    bcrypt.compareSync.mockReturnValue(true); // new == current

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ email: 'john@test.com', token: '123456', new_password: 'samepass123' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/same as your current/i);
  });

  it('400 when new password in history', async () => {
    const history = [{ password_hash: '$old' }];
    db.query
      .mockImplementationOnce(q([user]))
      .mockImplementationOnce(q(tokenRecord))
      .mockImplementationOnce(q(history));

    bcrypt.compareSync
      .mockReturnValueOnce(false)  // new != current
      .mockReturnValueOnce(true);  // new matches history[0]

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ email: 'john@test.com', token: '123456', new_password: 'historypass123' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/last 3 passwords/i);
  });
});

// ─── Additional login edge cases ──────────────────────────────────────────────

describe('POST /api/auth/login (customer code-send DB errors)', () => {
  const user = {
    id: 1, name: 'John', email: 'john@test.com',
    password_hash: '$hashed', role: 'customer', phone: null, status: 'active'
  };

  it('500 when DELETE verification_codes fails', async () => {
    db.query
      .mockImplementationOnce((sql, p, cb) => cb(null, [user])) // SELECT user ok
      .mockImplementationOnce((sql, p, cb) => cb(new Error('DB delete error'))); // DELETE fails

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'john@test.com', password: 'password123' });

    expect(res.status).toBe(500);
  });

  it('500 when INSERT verification_code fails', async () => {
    db.query
      .mockImplementationOnce((sql, p, cb) => cb(null, [user]))   // SELECT user
      .mockImplementationOnce((sql, p, cb) => cb(null, {}))        // DELETE ok
      .mockImplementationOnce((sql, p, cb) => cb(new Error('DB insert error'))); // INSERT fails

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'john@test.com', password: 'password123' });

    expect(res.status).toBe(500);
  });
});

describe('POST /api/auth/verify-code (additional)', () => {
  const record = { code: '123456', expires_at: Date.now() + 60000, user_id: 1 };

  it('404 when user not found after valid code', async () => {
    db.query
      .mockImplementationOnce((sql, p, cb) => cb(null, [record])) // SELECT vcodes: found
      .mockImplementationOnce(() => {})                            // DELETE vcodes
      .mockImplementationOnce((sql, p, cb) => cb(null, []));       // SELECT user: not found

    const res = await request(app)
      .post('/api/auth/verify-code')
      .send({ email: 'john@test.com', code: '123456' });

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('User not found');
  });
});

describe('PUT /api/auth/change-password (additional)', () => {
  it('404 when user not found in database', async () => {
    db.query.mockImplementationOnce((sql, p, cb) => cb(null, [])); // SELECT: empty

    const res = await request(app)
      .put('/api/auth/change-password')
      .set('Authorization', CUSTOMER_TOKEN)
      .send({ current_password: 'oldpass123', new_password: 'newpass456' });

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('User not found');
  });
});
