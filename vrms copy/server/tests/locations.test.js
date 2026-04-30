jest.mock('../config/db', () => ({ query: jest.fn() }));

const request = require('supertest');
const express = require('express');
const db = require('../config/db');

const app = express();
app.use(express.json());
app.use('/api/locations', require('../routes/locations'));

const q = (result, err = null) => (sql, p, cb) => {
  const fn = typeof p === 'function' ? p : cb;
  if (fn) fn(err, result);
};
const qErr = (msg = 'DB error') => q(null, new Error(msg));

beforeEach(() => {
  jest.resetAllMocks();
  db.query.mockImplementation(q([]));
});

const locations = [
  { id: 1, name: 'Downtown', city: 'NYC', address: '1 Main St', is_active: 1 },
  { id: 2, name: 'Airport', city: 'NYC', address: '2 Airport Rd', is_active: 1 },
  { id: 3, name: 'Central', city: 'LA', address: '3 Center Ave', is_active: 1 },
];

// ─── GET /api/locations ───────────────────────────────────────────────────────

describe('GET /api/locations', () => {
  it('returns all active locations ordered by city', async () => {
    db.query.mockImplementationOnce(q(locations));

    const res = await request(app).get('/api/locations');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(3);
    expect(res.body[0].name).toBe('Downtown');
  });

  it('returns empty array when no locations', async () => {
    db.query.mockImplementationOnce(q([]));

    const res = await request(app).get('/api/locations');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('500 on database error', async () => {
    db.query.mockImplementationOnce(qErr());

    const res = await request(app).get('/api/locations');

    expect(res.status).toBe(500);
    expect(res.body.message).toBe('Database error');
  });
});

// ─── GET /api/locations/cities ────────────────────────────────────────────────

describe('GET /api/locations/cities', () => {
  it('returns distinct city names', async () => {
    db.query.mockImplementationOnce(q([{ city: 'LA' }, { city: 'NYC' }]));

    const res = await request(app).get('/api/locations/cities');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(['LA', 'NYC']);
  });

  it('returns empty array when no cities', async () => {
    db.query.mockImplementationOnce(q([]));

    const res = await request(app).get('/api/locations/cities');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('500 on database error', async () => {
    db.query.mockImplementationOnce(qErr());

    const res = await request(app).get('/api/locations/cities');

    expect(res.status).toBe(500);
  });
});

// ─── GET /api/locations/:city ─────────────────────────────────────────────────

describe('GET /api/locations/:city', () => {
  it('returns locations for a specific city', async () => {
    const nycLocations = locations.filter(l => l.city === 'NYC');
    db.query.mockImplementationOnce(q(nycLocations));

    const res = await request(app).get('/api/locations/NYC');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body.every(l => l.city === 'NYC')).toBe(true);
  });

  it('returns empty array when city has no locations', async () => {
    db.query.mockImplementationOnce(q([]));

    const res = await request(app).get('/api/locations/Unknown');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('500 on database error', async () => {
    db.query.mockImplementationOnce(qErr());

    const res = await request(app).get('/api/locations/NYC');

    expect(res.status).toBe(500);
  });
});
