jest.mock('../config/db', () => ({ query: jest.fn() }));
jest.mock('../config/sse', () => ({ broadcast: jest.fn(), addClient: jest.fn(), removeClient: jest.fn() }));
// mockFile can be set per-test; the `mock` prefix lets Jest hoist it safely
let mockFile;
jest.mock('../middleware/upload', () => ({
  single: () => (req, _res, next) => {
    if (mockFile) req.file = mockFile;
    next();
  },
}));

const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const SECRET = 'test_secret';
const ADMIN_TOKEN = `Bearer ${jwt.sign({ id: 99, role: 'admin' }, SECRET)}`;
const CUSTOMER_TOKEN = `Bearer ${jwt.sign({ id: 1, role: 'customer' }, SECRET)}`;

const app = express();
app.use(express.json());
app.use('/api/vehicles', require('../routes/vehicles'));

const q = (result, err = null) => (_sql, p, cb) => {
  const fn = typeof p === 'function' ? p : cb;
  if (fn) fn(err, result);
};
const qErr = (msg = 'DB error') => q(null, new Error(msg));

beforeEach(() => {
  jest.resetAllMocks();
  db.query.mockImplementation(q([]));
});

// ─── Get All Vehicles ─────────────────────────────────────────────────────────

describe('GET /api/vehicles', () => {
  it('returns list of vehicles', async () => {
    const vehicles = [
      { id: 1, brand: 'Toyota', model: 'Camry', price_per_day: 100 },
      { id: 2, brand: 'BMW', model: 'X5', price_per_day: 200 },
    ];
    db.query.mockImplementationOnce(q(vehicles));

    const res = await request(app).get('/api/vehicles');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].brand).toBe('Toyota');
  });

  it('returns empty array when no vehicles', async () => {
    db.query.mockImplementationOnce(q([]));

    const res = await request(app).get('/api/vehicles');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('accepts query filters (category_id, min_price, max_price)', async () => {
    db.query.mockImplementationOnce(q([]));

    const res = await request(app)
      .get('/api/vehicles')
      .query({ category_id: 1, min_price: 50, max_price: 200 });

    expect(res.status).toBe(200);
    expect(db.query).toHaveBeenCalledTimes(1);
  });

  it('accepts brand and transmission filters', async () => {
    db.query.mockImplementationOnce(q([]));

    const res = await request(app)
      .get('/api/vehicles')
      .query({ brand: 'Toyota', transmission: 'automatic' });

    expect(res.status).toBe(200);
  });

  it('500 on database error', async () => {
    db.query.mockImplementationOnce(qErr());

    const res = await request(app).get('/api/vehicles');
    expect(res.status).toBe(500);
  });
});

// ─── Get Vehicle Categories ───────────────────────────────────────────────────

describe('GET /api/vehicles/categories', () => {
  it('returns list of categories', async () => {
    const categories = [{ id: 1, name: 'SUV' }, { id: 2, name: 'Sedan' }];
    db.query.mockImplementationOnce(q(categories));

    const res = await request(app).get('/api/vehicles/categories');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].name).toBe('SUV');
  });

  it('500 on database error', async () => {
    db.query.mockImplementationOnce(qErr());

    const res = await request(app).get('/api/vehicles/categories');
    expect(res.status).toBe(500);
  });
});

// ─── Get Vehicle By ID ────────────────────────────────────────────────────────

describe('GET /api/vehicles/:id', () => {
  const vehicle = { id: 1, brand: 'Toyota', model: 'Camry', category_name: 'Sedan' };

  it('returns vehicle with images and reviews', async () => {
    db.query
      .mockImplementationOnce(q([vehicle]))   // SELECT vehicle
      .mockImplementationOnce(q([{ id: 1, image_url: '/uploads/car.jpg' }])) // SELECT images
      .mockImplementationOnce(q([{ id: 1, rating: 5, user_name: 'Bob' }]));  // SELECT reviews

    const res = await request(app).get('/api/vehicles/1');

    expect(res.status).toBe(200);
    expect(res.body.brand).toBe('Toyota');
    expect(res.body.images).toHaveLength(1);
    expect(res.body.reviews).toHaveLength(1);
  });

  it('404 when vehicle not found', async () => {
    db.query.mockImplementationOnce(q([]));

    const res = await request(app).get('/api/vehicles/999');
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Vehicle not found');
  });

  it('500 on database error', async () => {
    db.query.mockImplementationOnce(qErr());

    const res = await request(app).get('/api/vehicles/1');
    expect(res.status).toBe(500);
  });
});

// ─── Create Vehicle ───────────────────────────────────────────────────────────

describe('POST /api/vehicles', () => {
  it('creates vehicle as admin', async () => {
    db.query.mockImplementationOnce(q({ insertId: 5 }));

    const res = await request(app)
      .post('/api/vehicles')
      .set('Authorization', ADMIN_TOKEN)
      .send({ category_id: 1, brand: 'Honda', model: 'Civic', price_per_day: 80 });

    expect(res.status).toBe(201);
    expect(res.body.id).toBe(5);
    expect(res.body.message).toMatch(/created/i);
  });

  it('400 when required fields are missing', async () => {
    const res = await request(app)
      .post('/api/vehicles')
      .set('Authorization', ADMIN_TOKEN)
      .send({ brand: 'Honda', model: 'Civic' }); // missing category_id and price_per_day

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/required/i);
  });

  it('401 without token', async () => {
    const res = await request(app)
      .post('/api/vehicles')
      .send({ category_id: 1, brand: 'Honda', model: 'Civic', price_per_day: 80 });
    expect(res.status).toBe(401);
  });

  it('403 for non-admin', async () => {
    const res = await request(app)
      .post('/api/vehicles')
      .set('Authorization', CUSTOMER_TOKEN)
      .send({ category_id: 1, brand: 'Honda', model: 'Civic', price_per_day: 80 });
    expect(res.status).toBe(403);
  });

  it('500 on database error', async () => {
    db.query.mockImplementationOnce(qErr());

    const res = await request(app)
      .post('/api/vehicles')
      .set('Authorization', ADMIN_TOKEN)
      .send({ category_id: 1, brand: 'Honda', model: 'Civic', price_per_day: 80 });

    expect(res.status).toBe(500);
  });

  it('creates vehicle with optional fields', async () => {
    db.query.mockImplementationOnce(q({ insertId: 6 }));

    const res = await request(app)
      .post('/api/vehicles')
      .set('Authorization', ADMIN_TOKEN)
      .send({
        category_id: 1, brand: 'Ford', model: 'Focus',
        price_per_day: 70, year: 2022, plate_number: 'ABC123',
        description: 'Great car'
      });

    expect(res.status).toBe(201);
  });
});

// ─── Update Vehicle ───────────────────────────────────────────────────────────

describe('PUT /api/vehicles/:id', () => {
  it('updates vehicle as admin', async () => {
    db.query.mockImplementationOnce(q({ affectedRows: 1 }));

    const res = await request(app)
      .put('/api/vehicles/1')
      .set('Authorization', ADMIN_TOKEN)
      .send({ price_per_day: 150, status: 'maintenance' });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/updated/i);
  });

  it('404 when vehicle not found', async () => {
    db.query.mockImplementationOnce(q({ affectedRows: 0 }));

    const res = await request(app)
      .put('/api/vehicles/999')
      .set('Authorization', ADMIN_TOKEN)
      .send({ price_per_day: 150 });

    expect(res.status).toBe(404);
  });

  it('401 without token', async () => {
    const res = await request(app)
      .put('/api/vehicles/1')
      .send({ price_per_day: 150 });
    expect(res.status).toBe(401);
  });

  it('403 for non-admin', async () => {
    const res = await request(app)
      .put('/api/vehicles/1')
      .set('Authorization', CUSTOMER_TOKEN)
      .send({ price_per_day: 150 });
    expect(res.status).toBe(403);
  });

  it('500 on database error', async () => {
    db.query.mockImplementationOnce(qErr());

    const res = await request(app)
      .put('/api/vehicles/1')
      .set('Authorization', ADMIN_TOKEN)
      .send({ price_per_day: 150 });

    expect(res.status).toBe(500);
  });
});

// ─── Delete Vehicle ───────────────────────────────────────────────────────────

describe('DELETE /api/vehicles/:id', () => {
  it('deletes vehicle as admin', async () => {
    db.query.mockImplementationOnce(q({ affectedRows: 1 }));

    const res = await request(app)
      .delete('/api/vehicles/1')
      .set('Authorization', ADMIN_TOKEN);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/deleted/i);
  });

  it('404 when vehicle not found', async () => {
    db.query.mockImplementationOnce(q({ affectedRows: 0 }));

    const res = await request(app)
      .delete('/api/vehicles/999')
      .set('Authorization', ADMIN_TOKEN);

    expect(res.status).toBe(404);
  });

  it('401 without token', async () => {
    const res = await request(app).delete('/api/vehicles/1');
    expect(res.status).toBe(401);
  });

  it('403 for non-admin', async () => {
    const res = await request(app)
      .delete('/api/vehicles/1')
      .set('Authorization', CUSTOMER_TOKEN);
    expect(res.status).toBe(403);
  });

  it('500 on database error', async () => {
    db.query.mockImplementationOnce(qErr());

    const res = await request(app)
      .delete('/api/vehicles/1')
      .set('Authorization', ADMIN_TOKEN);

    expect(res.status).toBe(500);
  });
});

// ─── Upload Vehicle Image ─────────────────────────────────────────────────────

describe('POST /api/vehicles/:id/images', () => {
  it('401 without token', async () => {
    const res = await request(app).post('/api/vehicles/1/images');
    expect(res.status).toBe(401);
  });

  it('403 for non-admin', async () => {
    const res = await request(app)
      .post('/api/vehicles/1/images')
      .set('Authorization', CUSTOMER_TOKEN);
    expect(res.status).toBe(403);
  });

  it('400 when no file provided', async () => {
    mockFile = undefined;
    const res = await request(app)
      .post('/api/vehicles/1/images')
      .set('Authorization', ADMIN_TOKEN);

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('No image file provided');
  });

  it('201 when file uploaded as first image (becomes primary)', async () => {
    mockFile = { filename: 'car.jpg' };
    db.query
      .mockImplementationOnce(q([]))                   // SELECT: no primary yet
      .mockImplementationOnce(q({ insertId: 10 }));    // INSERT image

    const res = await request(app)
      .post('/api/vehicles/1/images')
      .set('Authorization', ADMIN_TOKEN);

    expect(res.status).toBe(201);
    expect(res.body.image_url).toBe('/uploads/car.jpg');
    expect(res.body.id).toBe(10);
  });

  it('201 when file uploaded as non-primary (primary already exists)', async () => {
    mockFile = { filename: 'car2.jpg' };
    db.query
      .mockImplementationOnce(q([{ id: 5 }]))          // SELECT: primary exists
      .mockImplementationOnce(q({ insertId: 11 }));    // INSERT image

    const res = await request(app)
      .post('/api/vehicles/1/images')
      .set('Authorization', ADMIN_TOKEN);

    expect(res.status).toBe(201);
    expect(res.body.image_url).toBe('/uploads/car2.jpg');
  });

  it('500 on database error during image insert', async () => {
    mockFile = { filename: 'car.jpg' };
    db.query
      .mockImplementationOnce(q([]))
      .mockImplementationOnce(qErr());

    const res = await request(app)
      .post('/api/vehicles/1/images')
      .set('Authorization', ADMIN_TOKEN);

    expect(res.status).toBe(500);
  });
});
