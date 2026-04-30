jest.mock('../config/db', () => ({ query: jest.fn() }));
jest.mock('../config/email', () => ({
  sendBookingCompleted: jest.fn().mockResolvedValue(),
  sendBookingConfirmation: jest.fn().mockResolvedValue(),
  sendCancellationApproved: jest.fn().mockResolvedValue(),
  sendStaffWelcome: jest.fn().mockResolvedValue(),
}));
jest.mock('../config/sse', () => ({
  broadcast: jest.fn(),
  addClient: jest.fn(),
  removeClient: jest.fn(),
}));
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('$hashed'),
  compare: jest.fn().mockResolvedValue(true),
  hashSync: jest.fn().mockReturnValue('$hashed'),
  compareSync: jest.fn().mockReturnValue(false),
}));

const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const email = require('../config/email');
const bcrypt = require('bcryptjs');

const SECRET = 'test_secret';
const ADMIN_TOKEN = `Bearer ${jwt.sign({ id: 99, role: 'admin' }, SECRET)}`;
const STAFF_TOKEN = `Bearer ${jwt.sign({ id: 88, role: 'shop_worker' }, SECRET)}`;
const CUSTOMER_TOKEN = `Bearer ${jwt.sign({ id: 1, role: 'customer' }, SECRET)}`;

const app = express();
app.use(express.json());
app.use('/api/admin', require('../routes/admin'));

const q = (result, err = null) => (sql, p, cb) => {
  const fn = typeof p === 'function' ? p : cb;
  if (fn) fn(err, result);
};
const qErr = (msg = 'DB error') => q(null, new Error(msg));
const qNoop = () => {};

beforeEach(() => {
  jest.resetAllMocks();
  db.query.mockImplementation(q({ affectedRows: 1 }));
  email.sendBookingCompleted.mockResolvedValue();
  email.sendBookingConfirmation.mockResolvedValue();
  email.sendCancellationApproved.mockResolvedValue();
  email.sendStaffWelcome.mockResolvedValue();
  bcrypt.hash.mockResolvedValue('$hashed');
});

// ─── Create Staff ─────────────────────────────────────────────────────────────

describe('POST /api/admin/staff', () => {
  it('creates call_center staff as admin', async () => {
    db.query
      .mockImplementationOnce(q([]))              // SELECT: email not taken
      .mockImplementationOnce(q({ insertId: 5 })); // INSERT user

    const res = await request(app)
      .post('/api/admin/staff')
      .set('Authorization', ADMIN_TOKEN)
      .send({ name: 'Alice', email: 'alice@test.com', role: 'call_center' });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/staff account created/i);
    expect(email.sendStaffWelcome).toHaveBeenCalledTimes(1);
  });

  it('creates shop_worker staff as admin', async () => {
    db.query
      .mockImplementationOnce(q([]))
      .mockImplementationOnce(q({ insertId: 6 }));

    const res = await request(app)
      .post('/api/admin/staff')
      .set('Authorization', ADMIN_TOKEN)
      .send({ name: 'Bob', email: 'bob@test.com', role: 'shop_worker' });

    expect(res.status).toBe(200);
  });

  it('400 when name is missing', async () => {
    const res = await request(app)
      .post('/api/admin/staff')
      .set('Authorization', ADMIN_TOKEN)
      .send({ email: 'bob@test.com', role: 'shop_worker' });
    expect(res.status).toBe(400);
  });

  it('400 when email is missing', async () => {
    const res = await request(app)
      .post('/api/admin/staff')
      .set('Authorization', ADMIN_TOKEN)
      .send({ name: 'Bob', role: 'shop_worker' });
    expect(res.status).toBe(400);
  });

  it('400 when role is invalid', async () => {
    const res = await request(app)
      .post('/api/admin/staff')
      .set('Authorization', ADMIN_TOKEN)
      .send({ name: 'Bob', email: 'bob@test.com', role: 'admin' }); // admin not allowed here

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid role/i);
  });

  it('400 when email already registered', async () => {
    db.query.mockImplementationOnce(q([{ id: 1 }])); // email taken

    const res = await request(app)
      .post('/api/admin/staff')
      .set('Authorization', ADMIN_TOKEN)
      .send({ name: 'Bob', email: 'existing@test.com', role: 'shop_worker' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/already registered/i);
  });

  it('403 for non-admin', async () => {
    const res = await request(app)
      .post('/api/admin/staff')
      .set('Authorization', STAFF_TOKEN)
      .send({ name: 'Bob', email: 'bob@test.com', role: 'shop_worker' });
    expect(res.status).toBe(403);
  });

  it('401 without token', async () => {
    const res = await request(app)
      .post('/api/admin/staff')
      .send({ name: 'Bob', email: 'bob@test.com', role: 'shop_worker' });
    expect(res.status).toBe(401);
  });
});

// ─── Get All Users ────────────────────────────────────────────────────────────

describe('GET /api/admin/users', () => {
  const users = [
    { id: 1, name: 'John', email: 'john@test.com', role: 'customer', status: 'active' },
    { id: 2, name: 'Jane', email: 'jane@test.com', role: 'admin', status: 'active' },
  ];

  it('returns all users for admin', async () => {
    db.query.mockImplementationOnce(q(users));

    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', ADMIN_TOKEN);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  it('returns all users for staff', async () => {
    db.query.mockImplementationOnce(q(users));

    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', STAFF_TOKEN);

    expect(res.status).toBe(200);
  });

  it('403 for customer', async () => {
    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', CUSTOMER_TOKEN);
    expect(res.status).toBe(403);
  });

  it('401 without token', async () => {
    const res = await request(app).get('/api/admin/users');
    expect(res.status).toBe(401);
  });

  it('500 on database error', async () => {
    db.query.mockImplementationOnce(qErr());

    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', ADMIN_TOKEN);

    expect(res.status).toBe(500);
  });
});

// ─── Delete User ──────────────────────────────────────────────────────────────

describe('DELETE /api/admin/users/:id', () => {
  it('deletes user successfully as admin', async () => {
    // Default mock returns { affectedRows: 1 } for all queries (cleanup + final delete)
    const res = await request(app)
      .delete('/api/admin/users/5')
      .set('Authorization', ADMIN_TOKEN);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('User deleted');
  });

  it('400 when admin tries to delete their own account', async () => {
    const selfToken = `Bearer ${jwt.sign({ id: 99, role: 'admin' }, SECRET)}`;

    const res = await request(app)
      .delete('/api/admin/users/99')
      .set('Authorization', selfToken);

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/cannot delete your own/i);
  });

  it('403 for non-admin', async () => {
    const res = await request(app)
      .delete('/api/admin/users/5')
      .set('Authorization', STAFF_TOKEN);
    expect(res.status).toBe(403);
  });

  it('401 without token', async () => {
    const res = await request(app).delete('/api/admin/users/5');
    expect(res.status).toBe(401);
  });
});

// ─── Update User Role ─────────────────────────────────────────────────────────

describe('PUT /api/admin/users/:id/role', () => {
  it('updates user role as admin', async () => {
    db.query.mockImplementationOnce(q({ affectedRows: 1 }));

    const res = await request(app)
      .put('/api/admin/users/5/role')
      .set('Authorization', ADMIN_TOKEN)
      .send({ role: 'shop_worker' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Role updated');
  });

  it('400 when admin tries to change their own role', async () => {
    const res = await request(app)
      .put('/api/admin/users/99/role')
      .set('Authorization', ADMIN_TOKEN)
      .send({ role: 'user' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/cannot change your own role/i);
  });

  it('400 when role is invalid', async () => {
    const res = await request(app)
      .put('/api/admin/users/5/role')
      .set('Authorization', ADMIN_TOKEN)
      .send({ role: 'superadmin' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid role/i);
  });

  it('accepts all valid roles', async () => {
    const validRoles = ['user', 'admin', 'call_center', 'shop_worker'];
    for (const role of validRoles) {
      db.query.mockImplementationOnce(q({ affectedRows: 1 }));

      const res = await request(app)
        .put('/api/admin/users/5/role')
        .set('Authorization', ADMIN_TOKEN)
        .send({ role });

      expect(res.status).toBe(200);
    }
  });

  it('404 when user not found', async () => {
    db.query.mockImplementationOnce(q({ affectedRows: 0 }));

    const res = await request(app)
      .put('/api/admin/users/999/role')
      .set('Authorization', ADMIN_TOKEN)
      .send({ role: 'shop_worker' });

    expect(res.status).toBe(404);
  });

  it('403 for non-admin', async () => {
    const res = await request(app)
      .put('/api/admin/users/5/role')
      .set('Authorization', STAFF_TOKEN)
      .send({ role: 'user' });
    expect(res.status).toBe(403);
  });
});

// ─── Update Booking Status ────────────────────────────────────────────────────

describe('PUT /api/admin/bookings/:id/status', () => {
  it('updates booking status as staff', async () => {
    db.query.mockImplementationOnce(q({ affectedRows: 1 }));

    const res = await request(app)
      .put('/api/admin/bookings/1/status')
      .set('Authorization', STAFF_TOKEN)
      .send({ status: 'payment_pending' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Booking status updated');
  });

  it('404 when booking not found', async () => {
    db.query.mockImplementationOnce(q({ affectedRows: 0 }));

    const res = await request(app)
      .put('/api/admin/bookings/999/status')
      .set('Authorization', STAFF_TOKEN)
      .send({ status: 'confirmed' });

    expect(res.status).toBe(404);
  });

  it('updates to active status and sets vehicle to rented', async () => {
    db.query
      .mockImplementationOnce(q({ affectedRows: 1 })) // UPDATE booking
      .mockImplementationOnce(qNoop);                  // UPDATE vehicle to rented

    const res = await request(app)
      .put('/api/admin/bookings/1/status')
      .set('Authorization', STAFF_TOKEN)
      .send({ status: 'active' });

    expect(res.status).toBe(200);
  });

  it('sends confirmation email when status set to confirmed', async () => {
    const bookingRow = [{
      vehicle_id: 10, total_price: 500, start_date: '2025-06-01', end_date: '2025-06-06',
      pickup_time: null, return_time: null, brand: 'Toyota', model: 'Camry',
      name: 'John', email: 'john@test.com', payment_method: 'cash',
      pickup_location: null, return_location: null
    }];
    db.query
      .mockImplementationOnce(q({ affectedRows: 1 }))  // UPDATE booking
      .mockImplementationOnce(q(bookingRow));           // SELECT for email

    const res = await request(app)
      .put('/api/admin/bookings/1/status')
      .set('Authorization', STAFF_TOKEN)
      .send({ status: 'confirmed' });

    expect(res.status).toBe(200);
    // Email is sent asynchronously after response
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(email.sendBookingConfirmation).toHaveBeenCalledTimes(1);
  });

  it('403 for customer', async () => {
    const res = await request(app)
      .put('/api/admin/bookings/1/status')
      .set('Authorization', CUSTOMER_TOKEN)
      .send({ status: 'confirmed' });
    expect(res.status).toBe(403);
  });

  it('401 without token', async () => {
    const res = await request(app)
      .put('/api/admin/bookings/1/status')
      .send({ status: 'confirmed' });
    expect(res.status).toBe(401);
  });

  it('cancelled status updates vehicle to available and sends email', async () => {
    const bookingRow = [{
      vehicle_id: 10, total_price: 500, start_date: '2025-06-01', end_date: '2025-06-06',
      pickup_time: null, return_time: null, brand: 'Toyota', model: 'Camry',
      name: 'John', email: 'john@test.com', payment_method: 'cash',
      pickup_location: null, return_location: null
    }];
    db.query
      .mockImplementationOnce(q({ affectedRows: 1 }))  // UPDATE booking
      .mockImplementationOnce(q(bookingRow))            // SELECT for email/vehicle
      .mockImplementationOnce(qNoop);                   // UPDATE vehicles to available

    const res = await request(app)
      .put('/api/admin/bookings/1/status')
      .set('Authorization', STAFF_TOKEN)
      .send({ status: 'cancelled' });

    expect(res.status).toBe(200);
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(email.sendCancellationApproved).toHaveBeenCalledTimes(1);
  });

  it('completed status updates vehicle to available and sends email', async () => {
    const bookingRow = [{
      vehicle_id: 10, total_price: 500, start_date: '2025-06-01', end_date: '2025-06-06',
      pickup_time: null, return_time: null, brand: 'Toyota', model: 'Camry',
      name: 'John', email: 'john@test.com', payment_method: 'cash',
      pickup_location: null, return_location: null
    }];
    db.query
      .mockImplementationOnce(q({ affectedRows: 1 }))
      .mockImplementationOnce(q(bookingRow))
      .mockImplementationOnce(qNoop); // UPDATE vehicles to available

    const res = await request(app)
      .put('/api/admin/bookings/1/status')
      .set('Authorization', STAFF_TOKEN)
      .send({ status: 'completed' });

    expect(res.status).toBe(200);
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(email.sendBookingCompleted).toHaveBeenCalledTimes(1);
  });
});

// ─── GET /api/admin/events (SSE) ──────────────────────────────────────────────

const http = require('http');

describe('GET /api/admin/events', () => {
  it('401 when no token provided', async () => {
    const res = await request(app).get('/api/admin/events');
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('No token');
  });

  it('401 when token is invalid', async () => {
    const res = await request(app)
      .get('/api/admin/events')
      .query({ token: 'not.a.valid.token' });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid token');
  });

  it('403 when role is customer', async () => {
    const customerToken = jwt.sign({ id: 1, role: 'customer' }, SECRET);
    const res = await request(app)
      .get('/api/admin/events')
      .query({ token: customerToken });
    expect(res.status).toBe(403);
    expect(res.body.message).toBe('Access denied');
  });

  it('connects with SSE headers for admin', done => {
    const adminToken = jwt.sign({ id: 99, role: 'admin' }, SECRET);
    const server = app.listen(0, () => {
      const { port } = server.address();
      const req = http.get(
        `http://localhost:${port}/api/admin/events?token=${adminToken}`,
        res => {
          expect(res.statusCode).toBe(200);
          expect(res.headers['content-type']).toBe('text/event-stream');
          req.destroy();
          server.close(done);
        }
      );
      req.on('error', () => server.close(done));
    });
  });

  it('connects with SSE headers for shop_worker', done => {
    const staffToken = jwt.sign({ id: 88, role: 'shop_worker' }, SECRET);
    const server = app.listen(0, () => {
      const { port } = server.address();
      const req = http.get(
        `http://localhost:${port}/api/admin/events?token=${staffToken}`,
        res => {
          expect(res.statusCode).toBe(200);
          req.destroy();
          server.close(done);
        }
      );
      req.on('error', () => server.close(done));
    });
  });

  it('connects with SSE headers for callcenter (legacy alias)', done => {
    const legacyToken = jwt.sign({ id: 77, role: 'callcenter' }, SECRET);
    const server = app.listen(0, () => {
      const { port } = server.address();
      const req = http.get(
        `http://localhost:${port}/api/admin/events?token=${legacyToken}`,
        res => {
          expect(res.statusCode).toBe(200);
          req.destroy();
          server.close(done);
        }
      );
      req.on('error', () => server.close(done));
    });
  });
});
