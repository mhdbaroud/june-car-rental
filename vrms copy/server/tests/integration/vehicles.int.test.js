// Real DB — only email/sse are mocked
jest.mock('../../config/email', () => ({
  sendBookingReceived: jest.fn().mockResolvedValue(),
  sendBookingConfirmation: jest.fn().mockResolvedValue(),
}));
jest.mock('../../config/sse', () => ({ broadcast: jest.fn(), addClient: jest.fn(), removeClient: jest.fn() }));
jest.mock('express-rate-limit', () => () => (req, res, next) => next());

const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../../config/db');

const SECRET = 'test_secret';
const ADMIN_TOKEN = `Bearer ${jwt.sign({ id: 2, role: 'admin' }, SECRET)}`;

const app = express();
app.use(express.json());
app.use('/api/vehicles', require('../../routes/vehicles'));

const dbQuery = (sql, params = []) =>
  new Promise((resolve, reject) =>
    db.query(sql, params, (err, results) => (err ? reject(err) : resolve(results)))
  );

// ─── GET All Vehicles ─────────────────────────────────────────────────────────

describe('GET /api/vehicles (real DB)', () => {
  it('returns the full vehicle list from real data', async () => {
    const res = await request(app).get('/api/vehicles');

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(10);
    expect(res.body[0]).toHaveProperty('brand');
    expect(res.body[0]).toHaveProperty('price_per_day');
  });

  it('filters by category_id=1 (Sedan only)', async () => {
    const res = await request(app).get('/api/vehicles').query({ category_id: 1 });

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    res.body.forEach(v => expect(v.category_id).toBe(1));
  });

  it('filters by min_price and max_price', async () => {
    const res = await request(app).get('/api/vehicles').query({ min_price: 40, max_price: 60 });

    expect(res.status).toBe(200);
    res.body.forEach(v => {
      expect(Number(v.price_per_day)).toBeGreaterThanOrEqual(40);
      expect(Number(v.price_per_day)).toBeLessThanOrEqual(60);
    });
  });

  it('filters by brand', async () => {
    const res = await request(app).get('/api/vehicles').query({ brand: 'Toyota' });

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    res.body.forEach(v => expect(v.brand).toBe('Toyota'));
  });

  it('returns empty array for brand with no vehicles', async () => {
    const res = await request(app).get('/api/vehicles').query({ brand: 'NonExistentBrand' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

// ─── GET Categories ───────────────────────────────────────────────────────────

describe('GET /api/vehicles/categories (real DB)', () => {
  it('returns all 6 seeded categories', async () => {
    const res = await request(app).get('/api/vehicles/categories');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(6);

    const names = res.body.map(c => c.name);
    expect(names).toContain('Sedan');
    expect(names).toContain('SUV');
    expect(names).toContain('Luxury');
    expect(names).toContain('Economy');
  });
});

// ─── GET Vehicle By ID ────────────────────────────────────────────────────────

describe('GET /api/vehicles/:id (real DB)', () => {
  it('returns Toyota Camry with images and reviews arrays', async () => {
    const res = await request(app).get('/api/vehicles/1');

    expect(res.status).toBe(200);
    expect(res.body.brand).toBe('Toyota');
    expect(res.body.model).toBe('Camry');
    expect(res.body.price_per_day).toBe('50.00');
    expect(Array.isArray(res.body.images)).toBe(true);
    expect(Array.isArray(res.body.reviews)).toBe(true);
  });

  it('404 for non-existent vehicle', async () => {
    const res = await request(app).get('/api/vehicles/999999');

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Vehicle not found');
  });
});

// ─── Create Vehicle ───────────────────────────────────────────────────────────

describe('POST /api/vehicles (real DB)', () => {
  let createdVehicleId;

  afterAll(async () => {
    if (createdVehicleId) {
      await dbQuery('DELETE FROM vehicle_images WHERE vehicle_id = ?', [createdVehicleId]);
      await dbQuery('DELETE FROM vehicles WHERE id = ?', [createdVehicleId]);
    }
  });

  it('admin creates a vehicle and it appears in DB', async () => {
    const res = await request(app)
      .post('/api/vehicles')
      .set('Authorization', ADMIN_TOKEN)
      .send({ category_id: 1, brand: 'IntTestBrand', model: 'IntTestModel', price_per_day: 75, year: 2024, plate_number: 'INT-001' });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeTruthy();
    createdVehicleId = res.body.id;

    const rows = await dbQuery('SELECT brand, model, price_per_day FROM vehicles WHERE id = ?', [createdVehicleId]);
    expect(rows).toHaveLength(1);
    expect(rows[0].brand).toBe('IntTestBrand');
  });

  it('400 when required fields are missing', async () => {
    const res = await request(app)
      .post('/api/vehicles')
      .set('Authorization', ADMIN_TOKEN)
      .send({ brand: 'Honda' }); // missing category_id, model, price_per_day

    expect(res.status).toBe(400);
  });

  it('403 for non-admin', async () => {
    const customerToken = `Bearer ${jwt.sign({ id: 3, role: 'customer' }, SECRET)}`;
    const res = await request(app)
      .post('/api/vehicles')
      .set('Authorization', customerToken)
      .send({ category_id: 1, brand: 'X', model: 'Y', price_per_day: 50 });

    expect(res.status).toBe(403);
  });
});

// ─── Update & Delete Vehicle ──────────────────────────────────────────────────

describe('PUT + DELETE /api/vehicles/:id (real DB)', () => {
  let vehicleId;

  beforeAll(async () => {
    const result = await dbQuery(
      "INSERT INTO vehicles (category_id, brand, model, price_per_day, status) VALUES (1, 'TempBrand', 'TempModel', 55.00, 'available')"
    );
    vehicleId = result.insertId;
  });

  afterAll(async () => {
    await dbQuery('DELETE FROM vehicles WHERE id = ?', [vehicleId]);
  });

  it('updates vehicle price in real DB', async () => {
    const res = await request(app)
      .put(`/api/vehicles/${vehicleId}`)
      .set('Authorization', ADMIN_TOKEN)
      .send({ price_per_day: 99 });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/updated/i);

    const rows = await dbQuery('SELECT price_per_day FROM vehicles WHERE id = ?', [vehicleId]);
    expect(Number(rows[0].price_per_day)).toBe(99);
  });

  it('deletes vehicle from real DB', async () => {
    const res = await request(app)
      .delete(`/api/vehicles/${vehicleId}`)
      .set('Authorization', ADMIN_TOKEN);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/deleted/i);

    const rows = await dbQuery('SELECT id FROM vehicles WHERE id = ?', [vehicleId]);
    expect(rows).toHaveLength(0);
    vehicleId = null; // skip afterAll cleanup
  });

  it('404 when deleting non-existent vehicle', async () => {
    const res = await request(app)
      .delete('/api/vehicles/999999')
      .set('Authorization', ADMIN_TOKEN);

    expect(res.status).toBe(404);
  });
});
