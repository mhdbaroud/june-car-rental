jest.mock('../config/db', () => ({ query: jest.fn() }));
jest.mock('../config/email', () => ({
  sendBookingReceived: jest.fn().mockResolvedValue(),
  sendBookingConfirmation: jest.fn().mockResolvedValue(),
  sendPaymentRejected: jest.fn().mockResolvedValue(),
}));
jest.mock('../config/sse', () => ({
  broadcast: jest.fn(),
  addClient: jest.fn(),
  removeClient: jest.fn(),
}));

const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const email = require('../config/email');

const SECRET = 'test_secret';
const CUSTOMER_TOKEN = `Bearer ${jwt.sign({ id: 1, role: 'customer' }, SECRET)}`;
const STAFF_TOKEN = `Bearer ${jwt.sign({ id: 88, role: 'shop_worker' }, SECRET)}`;
const ADMIN_TOKEN = `Bearer ${jwt.sign({ id: 99, role: 'admin' }, SECRET)}`;

const app = express();
app.use(express.json());
app.use('/api/payments', require('../routes/payments'));

const q = (result, err = null) => (sql, p, cb) => {
  const fn = typeof p === 'function' ? p : cb;
  if (fn) fn(err, result);
};
const qErr = (msg = 'DB error') => q(null, new Error(msg));
const qNoop = () => {};

const booking = {
  id: 1, user_id: 1, vehicle_id: 10, status: 'pending', total_price: 500,
  brand: 'Toyota', model: 'Camry', name: 'John', email: 'john@test.com',
  start_date: '2025-06-01', end_date: '2025-06-06',
};

const idFields = {
  id_type: 'passport', id_number: 'A1234567',
  id_first_name: 'John', id_last_name: 'Doe',
  id_birth_date: '1990-01-01', id_nationality: 'US',
};

beforeEach(() => {
  jest.resetAllMocks();
  db.query.mockImplementation(q([]));
  email.sendBookingReceived.mockResolvedValue();
  email.sendBookingConfirmation.mockResolvedValue();
  email.sendPaymentRejected.mockResolvedValue();
});

// ─── Submit Payment ───────────────────────────────────────────────────────────

describe('POST /api/payments', () => {
  it('submits payment successfully', async () => {
    db.query
      .mockImplementationOnce(q([booking]))        // SELECT booking
      .mockImplementationOnce(q({ insertId: 1 }))  // INSERT/UPSERT payment
      .mockImplementationOnce(qNoop)               // UPDATE booking status
      .mockImplementationOnce(qNoop);              // INSERT notification

    const res = await request(app)
      .post('/api/payments')
      .set('Authorization', CUSTOMER_TOKEN)
      .send({ booking_id: 1, amount: 500, method: 'cash', ...idFields });

    expect(res.status).toBe(201);
    expect(res.body.message).toMatch(/awaiting admin confirmation/i);
    expect(email.sendBookingReceived).toHaveBeenCalledTimes(1);
  });

  it('400 when ID fields are missing', async () => {
    const res = await request(app)
      .post('/api/payments')
      .set('Authorization', CUSTOMER_TOKEN)
      .send({ booking_id: 1, amount: 500, method: 'cash' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/id fields/i);
  });

  it('400 when id_type is invalid', async () => {
    const res = await request(app)
      .post('/api/payments')
      .set('Authorization', CUSTOMER_TOKEN)
      .send({ booking_id: 1, amount: 500, method: 'cash', ...idFields, id_type: 'invalid' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid id type/i);
  });

  it('404 when booking not found or not owned', async () => {
    db.query.mockImplementationOnce(q([]));

    const res = await request(app)
      .post('/api/payments')
      .set('Authorization', CUSTOMER_TOKEN)
      .send({ booking_id: 999, amount: 500, method: 'cash', ...idFields });

    expect(res.status).toBe(404);
  });

  it('400 when booking status is not pending or confirmed', async () => {
    db.query.mockImplementationOnce(q([{ ...booking, status: 'completed' }]));

    const res = await request(app)
      .post('/api/payments')
      .set('Authorization', CUSTOMER_TOKEN)
      .send({ booking_id: 1, amount: 500, method: 'cash', ...idFields });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/cannot submit payment/i);
  });

  it('400 when payment amount does not match booking total', async () => {
    db.query.mockImplementationOnce(q([booking]));

    const res = await request(app)
      .post('/api/payments')
      .set('Authorization', CUSTOMER_TOKEN)
      .send({ booking_id: 1, amount: 999, method: 'cash', ...idFields }); // wrong amount

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/does not match/i);
  });

  it('401 without token', async () => {
    const res = await request(app)
      .post('/api/payments')
      .send({ booking_id: 1, amount: 500, method: 'cash', ...idFields });
    expect(res.status).toBe(401);
  });

  it('500 on database error', async () => {
    db.query.mockImplementationOnce(qErr());

    const res = await request(app)
      .post('/api/payments')
      .set('Authorization', CUSTOMER_TOKEN)
      .send({ booking_id: 1, amount: 500, method: 'cash', ...idFields });

    expect(res.status).toBe(500);
  });

  it('accepts confirmed bookings for payment', async () => {
    db.query
      .mockImplementationOnce(q([{ ...booking, status: 'confirmed' }]))
      .mockImplementationOnce(q({ insertId: 2 }))
      .mockImplementationOnce(qNoop)
      .mockImplementationOnce(qNoop);

    const res = await request(app)
      .post('/api/payments')
      .set('Authorization', CUSTOMER_TOKEN)
      .send({ booking_id: 1, amount: 500, method: 'card', ...idFields });

    expect(res.status).toBe(201);
  });
});

// ─── Confirm Payment ──────────────────────────────────────────────────────────

describe('PUT /api/payments/:booking_id/confirm-payment', () => {
  const paymentPendingBooking = {
    ...booking, status: 'payment_pending', user_id: 5,
    pickup_location_name: null, return_location_name: null, payment_method: 'cash'
  };

  it('confirms payment as staff', async () => {
    db.query
      .mockImplementationOnce(q([paymentPendingBooking])) // SELECT booking
      .mockImplementationOnce(q({}))                      // UPDATE booking status
      .mockImplementationOnce(qNoop)                      // UPDATE payment status
      .mockImplementationOnce(qNoop);                     // INSERT notification

    const res = await request(app)
      .put('/api/payments/1/confirm-payment')
      .set('Authorization', STAFF_TOKEN);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/payment confirmed/i);
    expect(email.sendBookingConfirmation).toHaveBeenCalledTimes(1);
  });

  it('400 when booking is not in payment_pending status', async () => {
    db.query.mockImplementationOnce(q([{ ...booking, status: 'confirmed' }]));

    const res = await request(app)
      .put('/api/payments/1/confirm-payment')
      .set('Authorization', STAFF_TOKEN);

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/not pending confirmation/i);
  });

  it('404 when booking not found', async () => {
    db.query.mockImplementationOnce(q([]));

    const res = await request(app)
      .put('/api/payments/999/confirm-payment')
      .set('Authorization', STAFF_TOKEN);

    expect(res.status).toBe(404);
  });

  it('403 for customer', async () => {
    const res = await request(app)
      .put('/api/payments/1/confirm-payment')
      .set('Authorization', CUSTOMER_TOKEN);
    expect(res.status).toBe(403);
  });

  it('401 without token', async () => {
    const res = await request(app).put('/api/payments/1/confirm-payment');
    expect(res.status).toBe(401);
  });
});

// ─── Reject Payment ───────────────────────────────────────────────────────────

describe('PUT /api/payments/:booking_id/reject-payment', () => {
  const paymentPendingBooking = {
    ...booking, status: 'payment_pending', user_id: 5
  };

  it('rejects payment as staff', async () => {
    db.query
      .mockImplementationOnce(q([paymentPendingBooking])) // SELECT booking
      .mockImplementationOnce(q({}))                      // UPDATE booking to pending
      .mockImplementationOnce(qNoop)                      // UPDATE vehicle to available
      .mockImplementationOnce(qNoop)                      // UPDATE payment to failed
      .mockImplementationOnce(qNoop);                     // INSERT notification

    const res = await request(app)
      .put('/api/payments/1/reject-payment')
      .set('Authorization', STAFF_TOKEN)
      .send({ reason: 'Invalid payment info' });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/rejected/i);
    expect(email.sendPaymentRejected).toHaveBeenCalledTimes(1);
  });

  it('400 when booking is not in payment_pending status', async () => {
    db.query.mockImplementationOnce(q([{ ...booking, status: 'pending' }]));

    const res = await request(app)
      .put('/api/payments/1/reject-payment')
      .set('Authorization', STAFF_TOKEN)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/not pending/i);
  });

  it('404 when booking not found', async () => {
    db.query.mockImplementationOnce(q([]));

    const res = await request(app)
      .put('/api/payments/999/reject-payment')
      .set('Authorization', STAFF_TOKEN)
      .send({});

    expect(res.status).toBe(404);
  });

  it('403 for customer', async () => {
    const res = await request(app)
      .put('/api/payments/1/reject-payment')
      .set('Authorization', CUSTOMER_TOKEN);
    expect(res.status).toBe(403);
  });

  it('works without a rejection reason', async () => {
    db.query
      .mockImplementationOnce(q([paymentPendingBooking]))
      .mockImplementationOnce(q({}))
      .mockImplementationOnce(qNoop)
      .mockImplementationOnce(qNoop)
      .mockImplementationOnce(qNoop);

    const res = await request(app)
      .put('/api/payments/1/reject-payment')
      .set('Authorization', STAFF_TOKEN)
      .send({}); // no reason

    expect(res.status).toBe(200);
  });
});
