jest.mock('../config/db', () => ({ query: jest.fn() }));

const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const SECRET = 'test_secret';
const CUSTOMER_TOKEN = `Bearer ${jwt.sign({ id: 1, role: 'customer' }, SECRET)}`;

const app = express();
app.use(express.json());
app.use('/api/saved-ids', require('../routes/savedIds'));

const q = (result, err = null) => (sql, p, cb) => {
  const fn = typeof p === 'function' ? p : cb;
  if (fn) fn(err, result);
};
const qErr = (msg = 'DB error') => q(null, new Error(msg));

const idPayload = {
  id_label: 'My Passport',
  id_type: 'passport',
  id_number: 'A1234567',
  id_first_name: 'John',
  id_last_name: 'Doe',
  id_birth_date: '1990-01-01',
  id_nationality: 'US',
};

beforeEach(() => {
  jest.resetAllMocks();
  db.query.mockImplementation(q([]));
});

// ─── Get Saved IDs ────────────────────────────────────────────────────────────

describe('GET /api/saved-ids', () => {
  it('returns user saved IDs', async () => {
    const ids = [{ id: 1, id_type: 'passport', id_number: 'A1234567' }];
    db.query.mockImplementationOnce(q(ids));

    const res = await request(app)
      .get('/api/saved-ids')
      .set('Authorization', CUSTOMER_TOKEN);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  it('returns empty array when no IDs', async () => {
    db.query.mockImplementationOnce(q([]));

    const res = await request(app)
      .get('/api/saved-ids')
      .set('Authorization', CUSTOMER_TOKEN);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('401 without token', async () => {
    const res = await request(app).get('/api/saved-ids');
    expect(res.status).toBe(401);
  });

  it('500 on database error', async () => {
    db.query.mockImplementationOnce(qErr());

    const res = await request(app)
      .get('/api/saved-ids')
      .set('Authorization', CUSTOMER_TOKEN);

    expect(res.status).toBe(500);
  });
});

// ─── Add Saved ID ─────────────────────────────────────────────────────────────

describe('POST /api/saved-ids', () => {
  it('adds ID successfully', async () => {
    db.query
      .mockImplementationOnce(q([{ count: 0 }]))   // COUNT
      .mockImplementationOnce(q([]))               // SELECT: not duplicate
      .mockImplementationOnce(q({ insertId: 1 })); // INSERT

    const res = await request(app)
      .post('/api/saved-ids')
      .set('Authorization', CUSTOMER_TOKEN)
      .send(idPayload);

    expect(res.status).toBe(201);
    expect(res.body.id_type).toBe('passport');
    expect(res.body.id_number).toBe('A1234567');
  });

  it('uses first_name + last_name as label when id_label is omitted', async () => {
    db.query
      .mockImplementationOnce(q([{ count: 0 }]))
      .mockImplementationOnce(q([]))
      .mockImplementationOnce(q({ insertId: 2 }));

    const { id_label, ...noLabel } = idPayload;

    const res = await request(app)
      .post('/api/saved-ids')
      .set('Authorization', CUSTOMER_TOKEN)
      .send(noLabel);

    expect(res.status).toBe(201);
    expect(res.body.id_label).toBe('John Doe');
  });

  it('400 when id_type is missing', async () => {
    const { id_type, ...missing } = idPayload;

    const res = await request(app)
      .post('/api/saved-ids')
      .set('Authorization', CUSTOMER_TOKEN)
      .send(missing);

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/missing id details/i);
  });

  it('400 when id_number is missing', async () => {
    const { id_number, ...missing } = idPayload;

    const res = await request(app)
      .post('/api/saved-ids')
      .set('Authorization', CUSTOMER_TOKEN)
      .send(missing);

    expect(res.status).toBe(400);
  });

  it('400 when id_first_name is missing', async () => {
    const { id_first_name, ...missing } = idPayload;

    const res = await request(app)
      .post('/api/saved-ids')
      .set('Authorization', CUSTOMER_TOKEN)
      .send(missing);

    expect(res.status).toBe(400);
  });

  it('400 when id_last_name is missing', async () => {
    const { id_last_name, ...missing } = idPayload;

    const res = await request(app)
      .post('/api/saved-ids')
      .set('Authorization', CUSTOMER_TOKEN)
      .send(missing);

    expect(res.status).toBe(400);
  });

  it('400 when id_birth_date is missing', async () => {
    const { id_birth_date, ...missing } = idPayload;

    const res = await request(app)
      .post('/api/saved-ids')
      .set('Authorization', CUSTOMER_TOKEN)
      .send(missing);

    expect(res.status).toBe(400);
  });

  it('400 when id_nationality is missing', async () => {
    const { id_nationality, ...missing } = idPayload;

    const res = await request(app)
      .post('/api/saved-ids')
      .set('Authorization', CUSTOMER_TOKEN)
      .send(missing);

    expect(res.status).toBe(400);
  });

  it('400 when maximum 5 IDs already saved', async () => {
    db.query.mockImplementationOnce(q([{ count: 5 }]));

    const res = await request(app)
      .post('/api/saved-ids')
      .set('Authorization', CUSTOMER_TOKEN)
      .send(idPayload);

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/maximum 5/i);
  });

  it('409 when ID already saved', async () => {
    db.query
      .mockImplementationOnce(q([{ count: 2 }]))
      .mockImplementationOnce(q([{ id: 1 }])); // duplicate

    const res = await request(app)
      .post('/api/saved-ids')
      .set('Authorization', CUSTOMER_TOKEN)
      .send(idPayload);

    expect(res.status).toBe(409);
    expect(res.body.message).toBe('ID already saved');
  });

  it('401 without token', async () => {
    const res = await request(app)
      .post('/api/saved-ids')
      .send(idPayload);
    expect(res.status).toBe(401);
  });

  it('500 on database error', async () => {
    db.query.mockImplementationOnce(qErr());

    const res = await request(app)
      .post('/api/saved-ids')
      .set('Authorization', CUSTOMER_TOKEN)
      .send(idPayload);

    expect(res.status).toBe(500);
  });
});

// ─── Delete Saved ID ──────────────────────────────────────────────────────────

describe('DELETE /api/saved-ids/:id', () => {
  it('deletes ID successfully', async () => {
    db.query.mockImplementationOnce(q({ affectedRows: 1 }));

    const res = await request(app)
      .delete('/api/saved-ids/1')
      .set('Authorization', CUSTOMER_TOKEN);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('ID removed');
  });

  it('404 when ID not found or not owned', async () => {
    db.query.mockImplementationOnce(q({ affectedRows: 0 }));

    const res = await request(app)
      .delete('/api/saved-ids/999')
      .set('Authorization', CUSTOMER_TOKEN);

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('ID not found');
  });

  it('401 without token', async () => {
    const res = await request(app).delete('/api/saved-ids/1');
    expect(res.status).toBe(401);
  });

  it('500 on database error', async () => {
    db.query.mockImplementationOnce(qErr());

    const res = await request(app)
      .delete('/api/saved-ids/1')
      .set('Authorization', CUSTOMER_TOKEN);

    expect(res.status).toBe(500);
  });
});
