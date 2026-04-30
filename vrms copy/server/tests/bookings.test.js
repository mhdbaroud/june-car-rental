jest.mock('../config/db', () => ({ query: jest.fn() }));
jest.mock('../config/email', () => ({
  sendBookingReceived: jest.fn().mockResolvedValue(),
  sendBookingConfirmation: jest.fn().mockResolvedValue(),
  sendCancellationRequest: jest.fn().mockResolvedValue(),
  sendCancellationApproved: jest.fn().mockResolvedValue(),
  sendCancellationRejected: jest.fn().mockResolvedValue(),
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
app.use('/api/bookings', require('../routes/bookings'));

const q = (result, err = null) => (sql, p, cb) => {
  const fn = typeof p === 'function' ? p : cb;
  if (fn) fn(err, result);
};
const qErr = (msg = 'DB error') => q(null, new Error(msg));
const qNoop = () => {};

const vehicle = { price_per_day: 100, status: 'available', brand: 'Toyota', model: 'Camry' };
const userNoAge = { date_of_birth: null, name: 'John', email: 'john@test.com' };
const booking = {
  id: 1, user_id: 1, vehicle_id: 10, start_date: '2025-01-10', end_date: '2025-01-15',
  total_price: 500, status: 'confirmed', brand: 'Toyota', model: 'Camry',
  name: 'John', email: 'john@test.com'
};

beforeEach(() => {
  jest.resetAllMocks();
  db.query.mockImplementation(q([]));
  email.sendBookingReceived.mockResolvedValue();
  email.sendBookingConfirmation.mockResolvedValue();
  email.sendCancellationRequest.mockResolvedValue();
  email.sendCancellationApproved.mockResolvedValue();
  email.sendCancellationRejected.mockResolvedValue();
});

// ─── Create Booking ───────────────────────────────────────────────────────────

describe('POST /api/bookings', () => {
  it('creates booking successfully', async () => {
    db.query
      .mockImplementationOnce(q([userNoAge]))          // SELECT user (age check)
      .mockImplementationOnce(q([]))                   // checkAvailability → available
      .mockImplementationOnce(q([vehicle]))            // SELECT vehicle
      .mockImplementationOnce(q({ insertId: 1 }))     // INSERT booking
      .mockImplementationOnce(qNoop);                  // INSERT notification (no cb)

    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', CUSTOMER_TOKEN)
      .send({ vehicle_id: 10, start_date: '2025-06-01', end_date: '2025-06-06' });

    expect(res.status).toBe(201);
    expect(res.body.booking_id).toBe(1);
    expect(res.body.total_price).toBe(500);
  });

  it('400 when vehicle_id missing', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', CUSTOMER_TOKEN)
      .send({ start_date: '2025-06-01', end_date: '2025-06-06' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/required/i);
  });

  it('400 when start_date missing', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', CUSTOMER_TOKEN)
      .send({ vehicle_id: 10, end_date: '2025-06-06' });
    expect(res.status).toBe(400);
  });

  it('400 when end_date missing', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', CUSTOMER_TOKEN)
      .send({ vehicle_id: 10, start_date: '2025-06-01' });
    expect(res.status).toBe(400);
  });

  it('401 without token', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .send({ vehicle_id: 10, start_date: '2025-06-01', end_date: '2025-06-06' });
    expect(res.status).toBe(401);
  });

  it('403 when user is under 21', async () => {
    const youngUser = { date_of_birth: new Date().toISOString().split('T')[0], name: 'Kid', email: 'kid@test.com' };
    db.query.mockImplementationOnce(q([youngUser]));

    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', CUSTOMER_TOKEN)
      .send({ vehicle_id: 10, start_date: '2025-06-01', end_date: '2025-06-06' });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/21 years old/i);
  });

  it('400 when vehicle is not available', async () => {
    db.query
      .mockImplementationOnce(q([userNoAge]))
      .mockImplementationOnce(q([{ id: 5 }])); // conflicting booking found → not available

    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', CUSTOMER_TOKEN)
      .send({ vehicle_id: 10, start_date: '2025-06-01', end_date: '2025-06-06' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/not available/i);
  });

  it('404 when vehicle not found', async () => {
    db.query
      .mockImplementationOnce(q([userNoAge]))
      .mockImplementationOnce(q([]))   // available
      .mockImplementationOnce(q([]));  // vehicle not found

    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', CUSTOMER_TOKEN)
      .send({ vehicle_id: 999, start_date: '2025-06-01', end_date: '2025-06-06' });

    expect(res.status).toBe(404);
  });

  it('400 when vehicle is under maintenance', async () => {
    db.query
      .mockImplementationOnce(q([userNoAge]))
      .mockImplementationOnce(q([]))
      .mockImplementationOnce(q([{ ...vehicle, status: 'maintenance' }]));

    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', CUSTOMER_TOKEN)
      .send({ vehicle_id: 10, start_date: '2025-06-01', end_date: '2025-06-06' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/maintenance/i);
  });

  it('400 when end date is not after start date', async () => {
    db.query
      .mockImplementationOnce(q([userNoAge]))
      .mockImplementationOnce(q([]))
      .mockImplementationOnce(q([vehicle]));

    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', CUSTOMER_TOKEN)
      .send({ vehicle_id: 10, start_date: '2025-06-06', end_date: '2025-06-01' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/after start date/i);
  });
});

// ─── Create and Complete Booking ──────────────────────────────────────────────

describe('POST /api/bookings/complete', () => {
  const idFields = {
    id_type: 'passport', id_number: 'A1234567',
    id_first_name: 'John', id_last_name: 'Doe',
    id_birth_date: '1990-01-01', id_nationality: 'US'
  };

  it('creates and completes booking successfully', async () => {
    db.query
      .mockImplementationOnce(q([userNoAge]))         // SELECT user
      .mockImplementationOnce(q([]))                  // checkAvailability
      .mockImplementationOnce(q([vehicle]))           // SELECT vehicle
      .mockImplementationOnce(q({ insertId: 1 }))    // INSERT booking
      .mockImplementationOnce(qNoop)                  // INSERT payments (no cb)
      .mockImplementationOnce(qNoop);                 // INSERT notifications (no cb)

    const res = await request(app)
      .post('/api/bookings/complete')
      .set('Authorization', CUSTOMER_TOKEN)
      .send({
        vehicle_id: 10, start_date: '2025-06-01', end_date: '2025-06-06',
        method: 'cash', ...idFields
      });

    expect(res.status).toBe(201);
    expect(res.body.booking_id).toBe(1);
  });

  it('400 when ID fields are missing', async () => {
    const res = await request(app)
      .post('/api/bookings/complete')
      .set('Authorization', CUSTOMER_TOKEN)
      .send({ vehicle_id: 10, start_date: '2025-06-01', end_date: '2025-06-06' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/id fields/i);
  });

  it('400 when id_type is invalid', async () => {
    const res = await request(app)
      .post('/api/bookings/complete')
      .set('Authorization', CUSTOMER_TOKEN)
      .send({
        vehicle_id: 10, start_date: '2025-06-01', end_date: '2025-06-06',
        ...idFields, id_type: 'invalid_type'
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid id type/i);
  });

  it('accepts all valid id_types', async () => {
    const validTypes = ['national_id', 'passport', 'driver_license', 'residence_permit'];
    for (const id_type of validTypes) {
      db.query
        .mockImplementationOnce(q([userNoAge]))
        .mockImplementationOnce(q([]))
        .mockImplementationOnce(q([vehicle]))
        .mockImplementationOnce(q({ insertId: 1 }))
        .mockImplementationOnce(qNoop)
        .mockImplementationOnce(qNoop);

      const res = await request(app)
        .post('/api/bookings/complete')
        .set('Authorization', CUSTOMER_TOKEN)
        .send({
          vehicle_id: 10, start_date: '2025-06-01', end_date: '2025-06-06',
          ...idFields, id_type
        });

      expect(res.status).toBe(201);
    }
  });

  it('401 without token', async () => {
    const res = await request(app)
      .post('/api/bookings/complete')
      .send({ vehicle_id: 10, start_date: '2025-06-01', end_date: '2025-06-06', ...idFields });
    expect(res.status).toBe(401);
  });
});

// ─── Get User Bookings ────────────────────────────────────────────────────────

describe('GET /api/bookings/my', () => {
  it('returns user bookings', async () => {
    const bookings = [{ ...booking }, { ...booking, id: 2 }];
    db.query.mockImplementationOnce(q(bookings));

    const res = await request(app)
      .get('/api/bookings/my')
      .set('Authorization', CUSTOMER_TOKEN);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  it('returns empty array when no bookings', async () => {
    db.query.mockImplementationOnce(q([]));

    const res = await request(app)
      .get('/api/bookings/my')
      .set('Authorization', CUSTOMER_TOKEN);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('401 without token', async () => {
    const res = await request(app).get('/api/bookings/my');
    expect(res.status).toBe(401);
  });

  it('500 on database error', async () => {
    db.query.mockImplementationOnce(qErr());

    const res = await request(app)
      .get('/api/bookings/my')
      .set('Authorization', CUSTOMER_TOKEN);

    expect(res.status).toBe(500);
  });
});

// ─── Get All Bookings (Staff) ─────────────────────────────────────────────────

describe('GET /api/bookings/all', () => {
  it('returns all bookings for staff', async () => {
    db.query.mockImplementationOnce(q([booking, { ...booking, id: 2 }]));

    const res = await request(app)
      .get('/api/bookings/all')
      .set('Authorization', STAFF_TOKEN);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  it('403 for customer', async () => {
    const res = await request(app)
      .get('/api/bookings/all')
      .set('Authorization', CUSTOMER_TOKEN);
    expect(res.status).toBe(403);
  });

  it('401 without token', async () => {
    const res = await request(app).get('/api/bookings/all');
    expect(res.status).toBe(401);
  });
});

// ─── Get Booked Dates (Public) ────────────────────────────────────────────────

describe('GET /api/bookings/booked-dates/:vehicle_id', () => {
  it('returns booked dates for a vehicle', async () => {
    const dates = [
      { start_date: '2025-06-01', end_date: '2025-06-05' },
      { start_date: '2025-06-10', end_date: '2025-06-15' },
    ];
    db.query.mockImplementationOnce(q(dates));

    const res = await request(app).get('/api/bookings/booked-dates/10');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  it('returns empty array when no bookings', async () => {
    db.query.mockImplementationOnce(q([]));

    const res = await request(app).get('/api/bookings/booked-dates/10');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('500 on database error', async () => {
    db.query.mockImplementationOnce(qErr());

    const res = await request(app).get('/api/bookings/booked-dates/10');
    expect(res.status).toBe(500);
  });
});

// ─── Get Booking By ID ────────────────────────────────────────────────────────

describe('GET /api/bookings/:id', () => {
  it('returns booking for customer (own booking)', async () => {
    db.query.mockImplementationOnce(q([booking]));

    const res = await request(app)
      .get('/api/bookings/1')
      .set('Authorization', CUSTOMER_TOKEN);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(1);
  });

  it('returns any booking for staff', async () => {
    db.query.mockImplementationOnce(q([{ ...booking, user_id: 99 }]));

    const res = await request(app)
      .get('/api/bookings/1')
      .set('Authorization', STAFF_TOKEN);

    expect(res.status).toBe(200);
  });

  it('404 when booking not found or not owned', async () => {
    db.query.mockImplementationOnce(q([]));

    const res = await request(app)
      .get('/api/bookings/999')
      .set('Authorization', CUSTOMER_TOKEN);

    expect(res.status).toBe(404);
  });

  it('401 without token', async () => {
    const res = await request(app).get('/api/bookings/1');
    expect(res.status).toBe(401);
  });

  it('500 on database error', async () => {
    db.query.mockImplementationOnce(qErr());

    const res = await request(app)
      .get('/api/bookings/1')
      .set('Authorization', CUSTOMER_TOKEN);

    expect(res.status).toBe(500);
  });
});

// ─── Request Cancellation ─────────────────────────────────────────────────────

describe('PUT /api/bookings/:id/request-cancellation', () => {
  it('requests cancellation successfully', async () => {
    db.query
      .mockImplementationOnce(q([{ ...booking, status: 'confirmed' }])) // SELECT booking
      .mockImplementationOnce(q({}))                                     // UPDATE status
      .mockImplementationOnce(qNoop)                                     // INSERT cancellation
      .mockImplementationOnce(qNoop);                                    // INSERT notification

    const res = await request(app)
      .put('/api/bookings/1/request-cancellation')
      .set('Authorization', CUSTOMER_TOKEN)
      .send({ reason: 'Change of plans' });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/cancellation request/i);
  });

  it('400 when booking not in cancellable status', async () => {
    db.query.mockImplementationOnce(q([{ ...booking, status: 'completed' }]));

    const res = await request(app)
      .put('/api/bookings/1/request-cancellation')
      .set('Authorization', CUSTOMER_TOKEN)
      .send({ reason: 'Change of plans' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/cannot request cancellation/i);
  });

  it('404 when booking not found or not owned', async () => {
    db.query.mockImplementationOnce(q([]));

    const res = await request(app)
      .put('/api/bookings/999/request-cancellation')
      .set('Authorization', CUSTOMER_TOKEN)
      .send({});

    expect(res.status).toBe(404);
  });

  it('401 without token', async () => {
    const res = await request(app)
      .put('/api/bookings/1/request-cancellation')
      .send({});
    expect(res.status).toBe(401);
  });

  it('can cancel pending bookings', async () => {
    db.query
      .mockImplementationOnce(q([{ ...booking, status: 'pending' }]))
      .mockImplementationOnce(q({}))
      .mockImplementationOnce(qNoop)
      .mockImplementationOnce(qNoop);

    const res = await request(app)
      .put('/api/bookings/1/request-cancellation')
      .set('Authorization', CUSTOMER_TOKEN)
      .send({});

    expect(res.status).toBe(200);
  });

  it('can cancel active bookings', async () => {
    db.query
      .mockImplementationOnce(q([{ ...booking, status: 'active' }]))
      .mockImplementationOnce(q({}))
      .mockImplementationOnce(qNoop)
      .mockImplementationOnce(qNoop);

    const res = await request(app)
      .put('/api/bookings/1/request-cancellation')
      .set('Authorization', CUSTOMER_TOKEN)
      .send({});

    expect(res.status).toBe(200);
  });
});

// ─── Approve Cancellation ─────────────────────────────────────────────────────

describe('PUT /api/bookings/:id/approve-cancellation', () => {
  it('approves cancellation as staff', async () => {
    const cancelBooking = { ...booking, status: 'cancellation_requested', user_id: 5, vehicle_id: 10 };
    db.query
      .mockImplementationOnce(q([cancelBooking]))   // SELECT booking
      .mockImplementationOnce(q({}))                // UPDATE booking status
      .mockImplementationOnce(qNoop)                // UPDATE vehicle status
      .mockImplementationOnce(qNoop);               // INSERT notification

    const res = await request(app)
      .put('/api/bookings/1/approve-cancellation')
      .set('Authorization', STAFF_TOKEN);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/approved/i);
    expect(email.sendCancellationApproved).toHaveBeenCalledTimes(1);
  });

  it('400 when booking not pending cancellation', async () => {
    db.query.mockImplementationOnce(q([{ ...booking, status: 'confirmed' }]));

    const res = await request(app)
      .put('/api/bookings/1/approve-cancellation')
      .set('Authorization', STAFF_TOKEN);

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/not pending cancellation/i);
  });

  it('404 when booking not found', async () => {
    db.query.mockImplementationOnce(q([]));

    const res = await request(app)
      .put('/api/bookings/999/approve-cancellation')
      .set('Authorization', STAFF_TOKEN);

    expect(res.status).toBe(404);
  });

  it('403 for customer', async () => {
    const res = await request(app)
      .put('/api/bookings/1/approve-cancellation')
      .set('Authorization', CUSTOMER_TOKEN);
    expect(res.status).toBe(403);
  });
});

// ─── Reject Cancellation ──────────────────────────────────────────────────────

describe('PUT /api/bookings/:id/reject-cancellation', () => {
  it('rejects cancellation as staff', async () => {
    const cancelBooking = { ...booking, status: 'cancellation_requested', user_id: 5 };
    db.query
      .mockImplementationOnce(q([cancelBooking])) // SELECT booking
      .mockImplementationOnce(q({}))              // UPDATE booking status
      .mockImplementationOnce(qNoop);             // INSERT notification

    const res = await request(app)
      .put('/api/bookings/1/reject-cancellation')
      .set('Authorization', STAFF_TOKEN)
      .send({ reason: 'Policy violation' });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/rejected/i);
  });

  it('400 when booking not pending cancellation', async () => {
    db.query.mockImplementationOnce(q([{ ...booking, status: 'confirmed' }]));

    const res = await request(app)
      .put('/api/bookings/1/reject-cancellation')
      .set('Authorization', STAFF_TOKEN)
      .send({});

    expect(res.status).toBe(400);
  });

  it('403 for customer', async () => {
    const res = await request(app)
      .put('/api/bookings/1/reject-cancellation')
      .set('Authorization', CUSTOMER_TOKEN);
    expect(res.status).toBe(403);
  });
});

// ─── Direct Cancel (Staff) ────────────────────────────────────────────────────

describe('PUT /api/bookings/:id/cancel', () => {
  it('cancels booking directly as staff', async () => {
    db.query
      .mockImplementationOnce(q([{ ...booking, status: 'confirmed' }])) // SELECT
      .mockImplementationOnce(q({}))  // UPDATE booking
      .mockImplementationOnce(qNoop)  // INSERT cancellation
      .mockImplementationOnce(qNoop)  // UPDATE vehicle
      .mockImplementationOnce(qNoop); // INSERT notification

    const res = await request(app)
      .put('/api/bookings/1/cancel')
      .set('Authorization', STAFF_TOKEN)
      .send({ reason: 'Admin decision' });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/cancelled/i);
  });

  it('400 when booking already cancelled', async () => {
    db.query.mockImplementationOnce(q([{ ...booking, status: 'cancelled' }]));

    const res = await request(app)
      .put('/api/bookings/1/cancel')
      .set('Authorization', STAFF_TOKEN)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/already cancelled/i);
  });

  it('404 when booking not found', async () => {
    db.query.mockImplementationOnce(q([]));

    const res = await request(app)
      .put('/api/bookings/999/cancel')
      .set('Authorization', STAFF_TOKEN)
      .send({});

    expect(res.status).toBe(404);
  });

  it('403 for customer', async () => {
    const res = await request(app)
      .put('/api/bookings/1/cancel')
      .set('Authorization', CUSTOMER_TOKEN)
      .send({});
    expect(res.status).toBe(403);
  });
});

// ─── Extend Booking ───────────────────────────────────────────────────────────

describe('PUT /api/bookings/:id/extend', () => {
  it('extends booking successfully', async () => {
    const confirmedBooking = {
      id: 1, user_id: 1, vehicle_id: 10,
      start_date: '2025-06-01', end_date: '2025-06-06', status: 'confirmed'
    };
    db.query
      .mockImplementationOnce(q([confirmedBooking]))       // SELECT booking
      .mockImplementationOnce(q([]))                       // checkAvailability
      .mockImplementationOnce(q([{ price_per_day: 100 }])) // SELECT vehicle price
      .mockImplementationOnce(q({}))                       // UPDATE booking end_date
      .mockImplementationOnce(qNoop);                      // INSERT extension (no cb)

    const res = await request(app)
      .put('/api/bookings/1/extend')
      .set('Authorization', CUSTOMER_TOKEN)
      .send({ new_end_date: '2025-06-10' });

    expect(res.status).toBe(200);
    expect(res.body.extra_charge).toBe(400); // 4 extra days × $100
    expect(res.body.new_end_date).toBe('2025-06-10');
  });

  it('404 when booking not found or not confirmed', async () => {
    db.query.mockImplementationOnce(q([]));

    const res = await request(app)
      .put('/api/bookings/999/extend')
      .set('Authorization', CUSTOMER_TOKEN)
      .send({ new_end_date: '2025-06-10' });

    expect(res.status).toBe(404);
  });

  it('400 when vehicle not available for extended dates', async () => {
    const confirmedBooking = {
      id: 1, user_id: 1, vehicle_id: 10,
      start_date: '2025-06-01', end_date: '2025-06-06', status: 'confirmed'
    };
    db.query
      .mockImplementationOnce(q([confirmedBooking]))
      .mockImplementationOnce(q([{ id: 99 }])); // conflicting booking

    const res = await request(app)
      .put('/api/bookings/1/extend')
      .set('Authorization', CUSTOMER_TOKEN)
      .send({ new_end_date: '2025-06-10' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/not available/i);
  });

  it('400 when new_end_date is not after current end_date', async () => {
    const confirmedBooking = {
      id: 1, user_id: 1, vehicle_id: 10,
      start_date: '2025-06-01', end_date: '2025-06-06', status: 'confirmed'
    };
    db.query
      .mockImplementationOnce(q([confirmedBooking]))
      .mockImplementationOnce(q([]))                  // available
      .mockImplementationOnce(q([{ price_per_day: 100 }]));

    const res = await request(app)
      .put('/api/bookings/1/extend')
      .set('Authorization', CUSTOMER_TOKEN)
      .send({ new_end_date: '2025-06-03' }); // before current end

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/after current end/i);
  });

  it('401 without token', async () => {
    const res = await request(app)
      .put('/api/bookings/1/extend')
      .send({ new_end_date: '2025-06-10' });
    expect(res.status).toBe(401);
  });
});

// ─── Same-day booking validation ──────────────────────────────────────────────

describe('POST /api/bookings (same-day validation)', () => {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

  it('400 when same-day booking has no pickup_time', async () => {
    // Route returns early (before DB) when pickup_time is missing on same-day bookings
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', CUSTOMER_TOKEN)
      .send({ vehicle_id: 10, start_date: todayStr, end_date: '2025-12-31' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/pickup time is required/i);
  });

  it('400 when same-day pickup_time is less than 3 hours from now', async () => {
    // "00:00" is always earlier than 3 hours from now — route returns early before DB
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', CUSTOMER_TOKEN)
      .send({ vehicle_id: 10, start_date: todayStr, end_date: '2025-12-31', pickup_time: '00:00' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/3 hours notice/i);
  });
});

describe('POST /api/bookings/complete (same-day validation)', () => {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

  const idFields = {
    id_type: 'passport', id_number: 'A1234567',
    id_first_name: 'John', id_last_name: 'Doe',
    id_birth_date: '1990-01-01', id_nationality: 'US'
  };

  it('400 when same-day booking has no pickup_time', async () => {
    const res = await request(app)
      .post('/api/bookings/complete')
      .set('Authorization', CUSTOMER_TOKEN)
      .send({ vehicle_id: 10, start_date: todayStr, end_date: '2025-12-31', ...idFields });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/pickup time is required/i);
  });

  it('400 when same-day pickup_time is less than 3 hours from now', async () => {
    const res = await request(app)
      .post('/api/bookings/complete')
      .set('Authorization', CUSTOMER_TOKEN)
      .send({
        vehicle_id: 10, start_date: todayStr, end_date: '2025-12-31',
        pickup_time: '00:00', ...idFields
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/3 hours notice/i);
  });
});

// ─── Booking with extras ──────────────────────────────────────────────────────

describe('POST /api/bookings (with extras)', () => {
  it('calculates total price including extras', async () => {
    const extra = { id: 1, name: 'GPS', price_per_day: 10, is_active: 1 };

    db.query
      .mockImplementationOnce(q([userNoAge]))           // SELECT user
      .mockImplementationOnce(q([]))                    // checkAvailability
      .mockImplementationOnce(q([vehicle]))             // SELECT vehicle (100/day)
      .mockImplementationOnce(q([extra]))               // SELECT extra by id
      .mockImplementationOnce(q({ insertId: 1 }))       // INSERT booking
      .mockImplementationOnce(qNoop)                    // INSERT booking_extras
      .mockImplementationOnce(qNoop);                   // INSERT notification

    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', CUSTOMER_TOKEN)
      .send({
        vehicle_id: 10, start_date: '2025-06-01', end_date: '2025-06-06',
        extras: [{ id: 1, quantity: 1 }]
      });

    // 5 days × $100 vehicle + 5 days × $10 GPS = $550
    expect(res.status).toBe(201);
    expect(res.body.total_price).toBe(550);
  });

  it('ignores inactive extras (not found in db)', async () => {
    db.query
      .mockImplementationOnce(q([userNoAge]))
      .mockImplementationOnce(q([]))
      .mockImplementationOnce(q([vehicle]))             // $100/day
      .mockImplementationOnce(q([]))                    // SELECT extra: not found (inactive)
      .mockImplementationOnce(q({ insertId: 1 }))
      .mockImplementationOnce(qNoop);

    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', CUSTOMER_TOKEN)
      .send({
        vehicle_id: 10, start_date: '2025-06-01', end_date: '2025-06-06',
        extras: [{ id: 999, quantity: 1 }] // non-existent extra
      });

    // Only vehicle price: 5 days × $100 = $500
    expect(res.status).toBe(201);
    expect(res.body.total_price).toBe(500);
  });
});

// ─── requestCancellation with payment_pending ─────────────────────────────────

describe('PUT /api/bookings/:id/request-cancellation (payment_pending)', () => {
  it('allows cancellation when status is payment_pending', async () => {
    db.query
      .mockImplementationOnce(q([{ ...booking, status: 'payment_pending' }]))
      .mockImplementationOnce(q({}))
      .mockImplementationOnce(qNoop)
      .mockImplementationOnce(qNoop);

    const res = await request(app)
      .put('/api/bookings/1/request-cancellation')
      .set('Authorization', CUSTOMER_TOKEN)
      .send({});

    expect(res.status).toBe(200);
  });
});
