const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { verifyToken, isAdmin, isStaff } = require('../middleware/auth');
const { sendBookingCompleted, sendBookingConfirmation, sendCancellationApproved, sendStaffWelcome } = require('../config/email');
const { addClient, removeClient } = require('../config/sse');
const jwt = require('jsonwebtoken');

// CREATE STAFF ACCOUNT
router.post('/staff', verifyToken, isAdmin, async (req, res) => {
  const { name, email, role } = req.body;
  if (!name || !email || !role) return res.status(400).json({ message: 'Name, email and role are required' });
  if (!['call_center', 'shop_worker'].includes(role)) return res.status(400).json({ message: 'Invalid role' });

  db.query('SELECT id FROM users WHERE email = ?', [email], async (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error' });
    if (results.length > 0) return res.status(400).json({ message: 'Email already registered' });

    const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-4).toUpperCase();
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    db.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [name, email, hashedPassword, role],
      (err) => {
        if (err) return res.status(500).json({ message: 'Database error', error: err.message });
        sendStaffWelcome(email, name, tempPassword, role)
          .then(() => res.json({ message: 'Staff account created and welcome email sent' }))
          .catch(e => {
            console.error('Staff welcome email error:', e.message);
            res.json({ message: 'Account created but failed to send welcome email. Temp password: ' + tempPassword });
          });
      }
    );
  });
});

// GET ALL USERS (staff can view, but only admins can mutate)
router.get('/users', verifyToken, isStaff, (req, res) => {
  db.query('SELECT id, name, email, phone, role, status, created_at FROM users ORDER BY created_at DESC',
    (err, results) => {
      if (err) return res.status(500).json({ message: 'Database error' });
      res.json(results);
    });
});

// DELETE USER
router.delete('/users/:id', verifyToken, isAdmin, (req, res) => {
  const { id } = req.params;
  if (parseInt(id) === req.user.id) {
    return res.status(400).json({ message: 'You cannot delete your own account' });
  }
  // Delete related records first to avoid foreign key constraint errors
  const cleanup = [
    'DELETE FROM saved_cards WHERE user_id = ?',
    'DELETE FROM saved_ids WHERE user_id = ?',
    'DELETE FROM notifications WHERE user_id = ?',
    'DELETE FROM password_history WHERE user_id = ?',
    'DELETE FROM verification_codes WHERE user_id = ?',
    'DELETE FROM ticket_responses WHERE user_id = ?',
    'DELETE FROM support_tickets WHERE user_id = ?',
    'DELETE FROM review_responses WHERE admin_id = ?',
    'DELETE FROM review_responses WHERE review_id IN (SELECT id FROM reviews WHERE user_id = ?)',
    'DELETE FROM reviews WHERE user_id = ?',
    'DELETE FROM driver_licenses WHERE user_id = ?',
    'DELETE FROM driver_licenses WHERE verified_by = ?',
    'DELETE FROM maintenance_logs WHERE admin_id = ?',
    'DELETE FROM booking_cancellations WHERE cancelled_by = ?',
    'DELETE FROM booking_cancellations WHERE booking_id IN (SELECT id FROM bookings WHERE user_id = ?)',
    'DELETE FROM booking_extensions WHERE booking_id IN (SELECT id FROM bookings WHERE user_id = ?)',
    'DELETE FROM payments WHERE booking_id IN (SELECT id FROM bookings WHERE user_id = ?)',
    'DELETE FROM vehicle_returns WHERE booking_id IN (SELECT id FROM bookings WHERE user_id = ?)',
    'DELETE FROM bookings WHERE user_id = ?',
  ];
  let i = 0;
  const runNext = () => {
    if (i >= cleanup.length) {
      db.query('DELETE FROM users WHERE id = ?', [id], (err, result) => {
        if (err) return res.status(500).json({ message: err.message });
        if (result.affectedRows === 0) return res.status(404).json({ message: 'User not found' });
        res.json({ message: 'User deleted' });
      });
      return;
    }
    db.query(cleanup[i++], [id], (err) => {
      if (err && err.code !== 'ER_NO_SUCH_TABLE') {
        return res.status(500).json({ message: err.message });
      }
      runNext();
    });
  };
  runNext();
});

// UPDATE USER ROLE
router.put('/users/:id/role', verifyToken, isAdmin, (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  if (!['user', 'admin', 'call_center', 'shop_worker'].includes(role)) {
    return res.status(400).json({ message: 'Invalid role' });
  }
  if (parseInt(id) === req.user.id) {
    return res.status(400).json({ message: 'You cannot change your own role' });
  }
  db.query('UPDATE users SET role = ? WHERE id = ?', [role, id], (err, result) => {
    if (err) return res.status(500).json({ message: 'Database error' });
    if (result.affectedRows === 0) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'Role updated' });
  });
});

// UPDATE BOOKING STATUS
router.put('/bookings/:id/status', verifyToken, isStaff, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  db.query('UPDATE bookings SET status = ? WHERE id = ?', [status, id], (err, result) => {
    if (err) return res.status(500).json({ message: 'Database error' });
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Booking not found' });

    res.json({ message: 'Booking status updated' });

    if (status === 'active') {
      db.query(
        'UPDATE vehicles SET status = "rented" WHERE id = (SELECT vehicle_id FROM bookings WHERE id = ?)',
        [id]
      );
    }

    if (['confirmed', 'cancelled', 'completed'].includes(status)) {
      db.query(
        `SELECT b.vehicle_id, b.total_price, b.start_date, b.end_date, b.pickup_time, b.return_time,
                v.brand, v.model, u.name, u.email,
                (SELECT method FROM payments WHERE booking_id = b.id ORDER BY id DESC LIMIT 1) as payment_method,
                pl.name as pickup_location, rl.name as return_location
         FROM bookings b
         JOIN vehicles v ON b.vehicle_id = v.id
         JOIN users u ON b.user_id = u.id
         LEFT JOIN locations pl ON b.pickup_location_id = pl.id
         LEFT JOIN locations rl ON b.return_location_id = rl.id
         WHERE b.id = ?`,
        [id],
        (queryErr, results) => {
          if (queryErr) { console.error('Status query error:', queryErr.message); return; }
          if (results.length === 0) { console.error('Status update: no booking found for id', id); return; }
          const row = results[0];
          const bookingData = {
            id,
            brand: row.brand,
            model: row.model,
            total_price: row.total_price,
            start_date: row.start_date,
            end_date: row.end_date,
            pickup_time: row.pickup_time,
            return_time: row.return_time,
            payment_method: row.payment_method,
            pickup_location: row.pickup_location,
            return_location: row.return_location,
          };

          if (status === 'confirmed') {
            sendBookingConfirmation(row.email, row.name, bookingData)
              .then(() => console.log(`Confirmation email sent to ${row.email} for booking #${id}`))
              .catch(e => console.error('Confirmation email error:', e.message));
          }

          if (status === 'cancelled') {
            db.query('UPDATE vehicles SET status = "available" WHERE id = ?', [row.vehicle_id]);
            sendCancellationApproved(row.email, row.name, bookingData)
              .then(() => console.log(`Cancellation email sent to ${row.email} for booking #${id}`))
              .catch(e => console.error('Cancellation email error:', e.message));
          }

          if (status === 'completed') {
            db.query('UPDATE vehicles SET status = "available" WHERE id = ?', [row.vehicle_id]);
            sendBookingCompleted(row.email, row.name, bookingData)
              .then(() => console.log(`Completion email sent to ${row.email} for booking #${id}`))
              .catch(e => console.error('Completion email error:', e.message));
          }
        }
      );
    }
  });
});

// SSE stream for real-time admin notifications
router.get('/events', (req, res) => {
  const token = req.query.token;
  if (!token) return res.status(401).json({ message: 'No token' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!['admin', 'call_center', 'shop_worker', 'callcenter'].includes(decoded.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  res.write('event: connected\ndata: {}\n\n');
  addClient(res);

  req.on('close', () => removeClient(res));
});

module.exports = router;