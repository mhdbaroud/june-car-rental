// Real DB — only email/sse/rate-limit are mocked
jest.mock('../../config/email', () => ({
  sendBookingReceived: jest.fn().mockResolvedValue(),
  sendBookingConfirmation: jest.fn().mockResolvedValue(),
  sendCancellationRequest: jest.fn().mockResolvedValue(),
  sendCancellationApproved: jest.fn().mockResolvedValue(),
  sendCancellationRejected: jest.fn().mockResolvedValue(),
  sendBookingCompleted: jest.fn().mockResolvedValue(),
}));
jest.mock('../../config/sse', () => ({ broadcast: jest.fn(), addClient: jest.fn(), removeClient: jest.fn() }));
jest.mock('express-rate-limit', () => () => (req, res, next) => next());

const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../../config/db');

const SECRET = 'test_secret';

// User 3: John Smith, DOB 1990-05-15 (age 35), role customer — seeded in dump
const CUSTOMER_TOKEN = `Bearer ${jwt.sign({ id: 3, role: 'customer' }, SECRET)}`;
const STAFF_TOKEN = `Bearer ${jwt.sign({ id: 2, role: 'admin' }, SECRET)}`;

const app = express();
app.use(express.json());
app.use('/api/bookings', require('../../routes/bookings'));

const dbQuery = (sql, params = []) =>
  new Promise((resolve, reject) =>
    db.query(sql, params, (err, results) => (err ? reject(err) : resolve(results)))
  );

// Vehicle 17 (Hyundai i10, $28/day, 'available') has no existing bookings in seed data.
// We use 2030 dates to guarantee no conflict with any 2026 seed bookings.
const VEHICLE_ID = 17;
const START = '2030-08-01';
const END = '2030-08-06'; // 5 days × $28 = $140

const createdBookingIds = [];

afterAll(async () => {
  if (createdBookingIds.length) {
    // Delete FK child rows first
    await dbQuery(`DELETE FROM booking_cancellations WHERE booking_id IN (${createdBookingIds.join(',')})`);
    await dbQuery(`DELETE FROM booking_extras WHERE booking_id IN (${createdBookingIds.join(',')})`);
    await dbQuery(`DELETE FROM bookings WHERE id IN (${createdBookingIds.join(',')})`);
  }
  await dbQuery('DELETE FROM notifications WHERE user_id = 3 AND created_at > NOW() - INTERVAL 1 HOUR');
});

// ─── Create Booking ───────────────────────────────────────────────────────────

describe('POST /api/bookings (real DB)', () => {
  it('creates booking, calculates correct price, writes to DB', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', CUSTOMER_TOKEN)
      .send({ vehicle_id: VEHICLE_ID, start_date: START, end_date: END });

    expect(res.status).toBe(201);
    expect(res.body.booking_id).toBeTruthy();
    expect(res.body.total_price).toBe(140); // 5 days × $28

    createdBookingIds.push(res.body.booking_id);

    // Verify real DB row
    const rows = await dbQuery('SELECT user_id, vehicle_id, total_price, status FROM bookings WHERE id = ?', [res.body.booking_id]);
    expect(rows).toHaveLength(1);
    expect(rows[0].user_id).toBe(3);
    expect(rows[0].vehicle_id).toBe(VEHICLE_ID);
    expect(Number(rows[0].total_price)).toBe(140);
    expect(rows[0].status).toBe('pending');
  });

  it('400 when same vehicle is already booked for overlapping dates (real availability check)', async () => {
    // Overlaps with the booking created above (2030-08-01 to 2030-08-06)
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', CUSTOMER_TOKEN)
      .send({ vehicle_id: VEHICLE_ID, start_date: '2030-08-04', end_date: '2030-08-10' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/not available/i);
  });

  it('non-overlapping dates on same vehicle succeed', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', CUSTOMER_TOKEN)
      .send({ vehicle_id: VEHICLE_ID, start_date: '2030-09-01', end_date: '2030-09-04' });

    expect(res.status).toBe(201);
    createdBookingIds.push(res.body.booking_id);
  });

  it('400 when vehicle_id is missing', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', CUSTOMER_TOKEN)
      .send({ start_date: START, end_date: END });

    expect(res.status).toBe(400);
  });

  it('401 without token', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .send({ vehicle_id: VEHICLE_ID, start_date: START, end_date: END });

    expect(res.status).toBe(401);
  });
});

// ─── Get Bookings ─────────────────────────────────────────────────────────────

describe('GET /api/bookings/my + /all (real DB)', () => {
  it('/my returns only the authenticated user\'s bookings', async () => {
    const res = await request(app)
      .get('/api/bookings/my')
      .set('Authorization', CUSTOMER_TOKEN);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    res.body.forEach(b => expect(b.user_id).toBe(3));
  });

  it('/all returns all bookings for staff', async () => {
    const res = await request(app)
      .get('/api/bookings/all')
      .set('Authorization', STAFF_TOKEN);

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    // Staff sees bookings from multiple users
    const userIds = [...new Set(res.body.map(b => b.user_id))];
    expect(userIds.length).toBeGreaterThan(1);
  });

  it('/all returns 403 for customer', async () => {
    const res = await request(app)
      .get('/api/bookings/all')
      .set('Authorization', CUSTOMER_TOKEN);

    expect(res.status).toBe(403);
  });
});

// ─── Get Booking By ID ────────────────────────────────────────────────────────

describe('GET /api/bookings/:id (real DB)', () => {
  it('returns booking details with vehicle join', async () => {
    const bookingId = createdBookingIds[0];
    const res = await request(app)
      .get(`/api/bookings/${bookingId}`)
      .set('Authorization', CUSTOMER_TOKEN);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(bookingId);
    expect(res.body.brand).toBe('Hyundai');
    expect(res.body.model).toBe('i10');
  });

  it('404 for booking belonging to another user', async () => {
    // Booking 7 belongs to user 9, not user 3
    const res = await request(app)
      .get('/api/bookings/7')
      .set('Authorization', CUSTOMER_TOKEN);

    expect(res.status).toBe(404);
  });
});

// ─── Request Cancellation ─────────────────────────────────────────────────────

describe('PUT /api/bookings/:id/request-cancellation (real DB)', () => {
  let pendingBookingId;

  beforeAll(async () => {
    const result = await dbQuery(
      `INSERT INTO bookings (user_id, vehicle_id, start_date, end_date, total_price, status)
       VALUES (3, ${VEHICLE_ID}, '2030-10-01', '2030-10-05', 112.00, 'pending')`
    );
    pendingBookingId = result.insertId;
    createdBookingIds.push(pendingBookingId);
  });

  it('transitions booking to cancellation_requested in DB', async () => {
    const res = await request(app)
      .put(`/api/bookings/${pendingBookingId}/request-cancellation`)
      .set('Authorization', CUSTOMER_TOKEN)
      .send({ reason: 'Integration test cancellation' });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/cancellation request/i);

    const rows = await dbQuery('SELECT status FROM bookings WHERE id = ?', [pendingBookingId]);
    expect(rows[0].status).toBe('cancellation_requested');
  });

  it('400 when booking is already cancellation_requested', async () => {
    const res = await request(app)
      .put(`/api/bookings/${pendingBookingId}/request-cancellation`)
      .set('Authorization', CUSTOMER_TOKEN)
      .send({ reason: 'Again' });

    expect(res.status).toBe(400);
  });
});

// ─── Booking With Extras ──────────────────────────────────────────────────────

describe('POST /api/bookings with extras (real DB)', () => {
  it('adds extras and calculates total price including extras', async () => {
    // Extras from seed: id=1 (GPS $5/day), id=2 (Child Seat $8/day)
    // 3 days × $28 = $84 base, + GPS 3×$5=$15, + ChildSeat 3×$8=$24 → total $123
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', CUSTOMER_TOKEN)
      .send({
        vehicle_id: VEHICLE_ID,
        start_date: '2030-11-01',
        end_date: '2030-11-04',
        extras: [{ id: 1 }, { id: 2 }], // controller expects objects with id property
      });

    expect(res.status).toBe(201);
    expect(res.body.total_price).toBe(123);
    createdBookingIds.push(res.body.booking_id);

    // The extras INSERT is fire-and-forget in the controller; give the pool time to flush it
    await new Promise(r => setTimeout(r, 200));

    const extraRows = await dbQuery(
      'SELECT extra_id FROM booking_extras WHERE booking_id = ?',
      [res.body.booking_id]
    );
    const extraIds = extraRows.map(r => r.extra_id);
    expect(extraIds).toContain(1);
    expect(extraIds).toContain(2);
  });
});
