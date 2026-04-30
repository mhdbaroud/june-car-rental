jest.mock('../config/db', () => ({ query: jest.fn() }));

const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const SECRET = 'test_secret';
const CUSTOMER_TOKEN = `Bearer ${jwt.sign({ id: 1, role: 'customer' }, SECRET)}`;

const app = express();
app.use(express.json());
app.use('/api/saved-cards', require('../routes/savedCards'));

const q = (result, err = null) => (sql, p, cb) => {
  const fn = typeof p === 'function' ? p : cb;
  if (fn) fn(err, result);
};
const qErr = (msg = 'DB error') => q(null, new Error(msg));

// A valid future expiry (year 2099)
const VALID_EXPIRY = '01/99';

beforeEach(() => {
  jest.resetAllMocks();
  db.query.mockImplementation(q([]));
});

// ─── Get Saved Cards ──────────────────────────────────────────────────────────

describe('GET /api/saved-cards', () => {
  it('returns user saved cards', async () => {
    const cards = [
      { id: 1, card_name: 'My Visa', last_four: '4242', expiry: VALID_EXPIRY, card_type: 'Visa' },
    ];
    db.query.mockImplementationOnce(q(cards));

    const res = await request(app)
      .get('/api/saved-cards')
      .set('Authorization', CUSTOMER_TOKEN);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].last_four).toBe('4242');
  });

  it('returns empty array when no cards', async () => {
    db.query.mockImplementationOnce(q([]));

    const res = await request(app)
      .get('/api/saved-cards')
      .set('Authorization', CUSTOMER_TOKEN);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('401 without token', async () => {
    const res = await request(app).get('/api/saved-cards');
    expect(res.status).toBe(401);
  });

  it('500 on database error', async () => {
    db.query.mockImplementationOnce(qErr());

    const res = await request(app)
      .get('/api/saved-cards')
      .set('Authorization', CUSTOMER_TOKEN);

    expect(res.status).toBe(500);
  });
});

// ─── Add Saved Card ───────────────────────────────────────────────────────────

describe('POST /api/saved-cards', () => {
  it('adds card successfully', async () => {
    db.query
      .mockImplementationOnce(q([{ count: 0 }]))   // COUNT: 0 cards saved
      .mockImplementationOnce(q([]))               // SELECT: not duplicate
      .mockImplementationOnce(q({ insertId: 1 })); // INSERT

    const res = await request(app)
      .post('/api/saved-cards')
      .set('Authorization', CUSTOMER_TOKEN)
      .send({ card_name: 'My Visa', last_four: '4242', expiry: VALID_EXPIRY, card_type: 'Visa' });

    expect(res.status).toBe(201);
    expect(res.body.last_four).toBe('4242');
  });

  it('400 when card_name is missing', async () => {
    const res = await request(app)
      .post('/api/saved-cards')
      .set('Authorization', CUSTOMER_TOKEN)
      .send({ last_four: '4242', expiry: VALID_EXPIRY });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/missing card details/i);
  });

  it('400 when last_four is missing', async () => {
    const res = await request(app)
      .post('/api/saved-cards')
      .set('Authorization', CUSTOMER_TOKEN)
      .send({ card_name: 'My Visa', expiry: VALID_EXPIRY });

    expect(res.status).toBe(400);
  });

  it('400 when expiry is missing', async () => {
    const res = await request(app)
      .post('/api/saved-cards')
      .set('Authorization', CUSTOMER_TOKEN)
      .send({ card_name: 'My Visa', last_four: '4242' });

    expect(res.status).toBe(400);
  });

  it('400 when expiry date is in the past', async () => {
    const res = await request(app)
      .post('/api/saved-cards')
      .set('Authorization', CUSTOMER_TOKEN)
      .send({ card_name: 'My Visa', last_four: '4242', expiry: '01/20' }); // expired in 2020

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/expired/i);
  });

  it('400 when expiry format is invalid', async () => {
    const res = await request(app)
      .post('/api/saved-cards')
      .set('Authorization', CUSTOMER_TOKEN)
      .send({ card_name: 'My Visa', last_four: '4242', expiry: '2024-01' }); // wrong format

    expect(res.status).toBe(400);
  });

  it('400 when max cards limit reached', async () => {
    db.query.mockImplementationOnce(q([{ count: 5 }])); // already 5 cards

    const res = await request(app)
      .post('/api/saved-cards')
      .set('Authorization', CUSTOMER_TOKEN)
      .send({ card_name: 'My Visa', last_four: '4242', expiry: VALID_EXPIRY });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/maximum 5/i);
  });

  it('409 when card already saved', async () => {
    db.query
      .mockImplementationOnce(q([{ count: 2 }]))    // COUNT: 2 cards
      .mockImplementationOnce(q([{ id: 1 }]));      // SELECT: duplicate found

    const res = await request(app)
      .post('/api/saved-cards')
      .set('Authorization', CUSTOMER_TOKEN)
      .send({ card_name: 'My Visa', last_four: '4242', expiry: VALID_EXPIRY });

    expect(res.status).toBe(409);
    expect(res.body.message).toBe('Card already saved');
  });

  it('401 without token', async () => {
    const res = await request(app)
      .post('/api/saved-cards')
      .send({ card_name: 'My Visa', last_four: '4242', expiry: VALID_EXPIRY });
    expect(res.status).toBe(401);
  });

  it('500 on database error', async () => {
    db.query.mockImplementationOnce(qErr());

    const res = await request(app)
      .post('/api/saved-cards')
      .set('Authorization', CUSTOMER_TOKEN)
      .send({ card_name: 'My Visa', last_four: '4242', expiry: VALID_EXPIRY });

    expect(res.status).toBe(500);
  });
});

// ─── Delete Saved Card ────────────────────────────────────────────────────────

describe('DELETE /api/saved-cards/:id', () => {
  it('deletes card successfully', async () => {
    db.query.mockImplementationOnce(q({ affectedRows: 1 }));

    const res = await request(app)
      .delete('/api/saved-cards/1')
      .set('Authorization', CUSTOMER_TOKEN);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Card removed');
  });

  it('404 when card not found or not owned', async () => {
    db.query.mockImplementationOnce(q({ affectedRows: 0 }));

    const res = await request(app)
      .delete('/api/saved-cards/999')
      .set('Authorization', CUSTOMER_TOKEN);

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Card not found');
  });

  it('401 without token', async () => {
    const res = await request(app).delete('/api/saved-cards/1');
    expect(res.status).toBe(401);
  });

  it('500 on database error', async () => {
    db.query.mockImplementationOnce(qErr());

    const res = await request(app)
      .delete('/api/saved-cards/1')
      .set('Authorization', CUSTOMER_TOKEN);

    expect(res.status).toBe(500);
  });
});

// ─── isExpiryValid (tested via POST) ─────────────────────────────────────────

describe('isExpiryValid edge cases (via POST /api/saved-cards)', () => {
  it('rejects month 0', async () => {
    const res = await request(app)
      .post('/api/saved-cards')
      .set('Authorization', CUSTOMER_TOKEN)
      .send({ card_name: 'X', last_four: '1234', expiry: '00/99' });
    expect(res.status).toBe(400);
  });

  it('rejects month 13', async () => {
    const res = await request(app)
      .post('/api/saved-cards')
      .set('Authorization', CUSTOMER_TOKEN)
      .send({ card_name: 'X', last_four: '1234', expiry: '13/99' });
    expect(res.status).toBe(400);
  });

  it('rejects single-digit month', async () => {
    const res = await request(app)
      .post('/api/saved-cards')
      .set('Authorization', CUSTOMER_TOKEN)
      .send({ card_name: 'X', last_four: '1234', expiry: '1/99' });
    expect(res.status).toBe(400);
  });

  it('rejects single-digit year', async () => {
    const res = await request(app)
      .post('/api/saved-cards')
      .set('Authorization', CUSTOMER_TOKEN)
      .send({ card_name: 'X', last_four: '1234', expiry: '01/9' });
    expect(res.status).toBe(400);
  });

  it('rejects missing slash', async () => {
    const res = await request(app)
      .post('/api/saved-cards')
      .set('Authorization', CUSTOMER_TOKEN)
      .send({ card_name: 'X', last_four: '1234', expiry: '0199' });
    expect(res.status).toBe(400);
  });

  it('accepts valid month 12', async () => {
    db.query
      .mockImplementationOnce(q([{ count: 0 }]))
      .mockImplementationOnce(q([]))
      .mockImplementationOnce(q({ insertId: 1 }));

    const res = await request(app)
      .post('/api/saved-cards')
      .set('Authorization', CUSTOMER_TOKEN)
      .send({ card_name: 'X', last_four: '1234', expiry: '12/99' });
    expect(res.status).toBe(201);
  });
});
