jest.mock('../config/db', () => ({ query: jest.fn() }));

const request = require('supertest');
const express = require('express');
const db = require('../config/db');

const app = express();
app.use(express.json());
app.use('/api/extras', require('../routes/extras'));

const q = (result, err = null) => (sql, p, cb) => {
  const fn = typeof p === 'function' ? p : cb;
  if (fn) fn(err, result);
};
const qErr = (msg = 'DB error') => q(null, new Error(msg));

beforeEach(() => {
  jest.resetAllMocks();
  db.query.mockImplementation(q([]));
});

// ─── GET /api/extras ──────────────────────────────────────────────────────────

describe('GET /api/extras', () => {
  it('returns active extras', async () => {
    const extras = [
      { id: 1, name: 'GPS', price_per_day: 5, is_active: 1 },
      { id: 2, name: 'Child Seat', price_per_day: 10, is_active: 1 },
    ];
    db.query.mockImplementationOnce(q(extras));

    const res = await request(app).get('/api/extras');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].name).toBe('GPS');
  });

  it('returns empty array when no extras available', async () => {
    db.query.mockImplementationOnce(q([]));

    const res = await request(app).get('/api/extras');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('500 on database error', async () => {
    db.query.mockImplementationOnce(qErr());

    const res = await request(app).get('/api/extras');

    expect(res.status).toBe(500);
    expect(res.body.message).toBe('Database error');
  });

  it('is a public endpoint (no auth required)', async () => {
    db.query.mockImplementationOnce(q([]));

    const res = await request(app).get('/api/extras');
    expect(res.status).toBe(200); // not 401
  });
});
