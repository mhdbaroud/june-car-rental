const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { verifyToken, isAdmin, isStaff } = require('../middleware/auth');

const SECRET = 'test_secret';

// Build a test app that exercises each middleware
function createTestApp() {
  const app = express();
  app.use(express.json());

  app.get('/protected', verifyToken, (req, res) => {
    res.json({ userId: req.user.id, role: req.user.role });
  });

  app.get('/admin-only', verifyToken, isAdmin, (req, res) => {
    res.json({ ok: true });
  });

  app.get('/staff-only', verifyToken, isStaff, (req, res) => {
    res.json({ ok: true });
  });

  return app;
}

const app = createTestApp();

// ─── verifyToken ──────────────────────────────────────────────────────────────

describe('verifyToken middleware', () => {
  it('allows request with valid token', async () => {
    const token = jwt.sign({ id: 1, role: 'customer' }, SECRET);

    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.userId).toBe(1);
    expect(res.body.role).toBe('customer');
  });

  it('401 when no Authorization header', async () => {
    const res = await request(app).get('/protected');

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/no token/i);
  });

  it('401 when token is malformed', async () => {
    const res = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer not.a.valid.token');

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid or expired/i);
  });

  it('401 when token is signed with wrong secret', async () => {
    const token = jwt.sign({ id: 1, role: 'customer' }, 'wrong_secret');

    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(401);
  });

  it('401 when Bearer prefix is missing', async () => {
    const token = jwt.sign({ id: 1, role: 'customer' }, SECRET);

    const res = await request(app)
      .get('/protected')
      .set('Authorization', token); // no "Bearer " prefix → split gives wrong result

    expect(res.status).toBe(401);
  });

  it('401 when token is expired', async () => {
    const token = jwt.sign({ id: 1, role: 'customer' }, SECRET, { expiresIn: '-1s' });

    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(401);
  });

  it('attaches decoded user to req.user', async () => {
    const token = jwt.sign({ id: 42, role: 'admin' }, SECRET);

    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.userId).toBe(42);
    expect(res.body.role).toBe('admin');
  });
});

// ─── isAdmin ──────────────────────────────────────────────────────────────────

describe('isAdmin middleware', () => {
  it('allows admin through', async () => {
    const token = jwt.sign({ id: 1, role: 'admin' }, SECRET);

    const res = await request(app)
      .get('/admin-only')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('403 for customer', async () => {
    const token = jwt.sign({ id: 1, role: 'customer' }, SECRET);

    const res = await request(app)
      .get('/admin-only')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/admins only/i);
  });

  it('403 for shop_worker', async () => {
    const token = jwt.sign({ id: 1, role: 'shop_worker' }, SECRET);

    const res = await request(app)
      .get('/admin-only')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });

  it('403 for call_center', async () => {
    const token = jwt.sign({ id: 1, role: 'call_center' }, SECRET);

    const res = await request(app)
      .get('/admin-only')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });
});

// ─── isStaff ──────────────────────────────────────────────────────────────────

describe('isStaff middleware', () => {
  it('allows admin through', async () => {
    const token = jwt.sign({ id: 1, role: 'admin' }, SECRET);

    const res = await request(app)
      .get('/staff-only')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
  });

  it('allows shop_worker through', async () => {
    const token = jwt.sign({ id: 1, role: 'shop_worker' }, SECRET);

    const res = await request(app)
      .get('/staff-only')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
  });

  it('allows call_center through', async () => {
    const token = jwt.sign({ id: 1, role: 'call_center' }, SECRET);

    const res = await request(app)
      .get('/staff-only')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
  });

  it('403 for customer', async () => {
    const token = jwt.sign({ id: 1, role: 'customer' }, SECRET);

    const res = await request(app)
      .get('/staff-only')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/staff only/i);
  });

  it('403 for unknown role', async () => {
    const token = jwt.sign({ id: 1, role: 'guest' }, SECRET);

    const res = await request(app)
      .get('/staff-only')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });

  it('allows callcenter (legacy alias without underscore)', async () => {
    const token = jwt.sign({ id: 1, role: 'callcenter' }, SECRET);

    const res = await request(app)
      .get('/staff-only')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
  });
});
