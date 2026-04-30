const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verifyToken, isAdmin, isStaff } = require('../middleware/auth');
const { sendBookingReceived, sendBookingConfirmation, sendPaymentRejected } = require('../config/email');

const VALID_ID_TYPES = ['national_id', 'passport', 'driver_license', 'residence_permit'];

// Customer submits payment + ID info
router.post('/', verifyToken, (req, res) => {
  const { booking_id, amount, method, id_type, id_number, id_first_name, id_last_name, id_birth_date, id_nationality } = req.body;
  const user_id = req.user.id;

  if (!id_type || !id_number || !id_first_name || !id_last_name || !id_birth_date || !id_nationality) {
    return res.status(400).json({ message: 'All ID fields are required' });
  }
  if (!VALID_ID_TYPES.includes(id_type)) {
    return res.status(400).json({ message: 'Invalid ID type' });
  }

  db.query(
    `SELECT b.*, v.brand, v.model, u.name, u.email FROM bookings b
     JOIN vehicles v ON b.vehicle_id = v.id
     JOIN users u ON b.user_id = u.id
     WHERE b.id = ? AND b.user_id = ?`,
    [booking_id, user_id],
    (err, results) => {
      if (err) return res.status(500).json({ message: 'Database error' });
      if (results.length === 0) return res.status(404).json({ message: 'Booking not found' });

      const booking = results[0];
      if (!['pending', 'confirmed'].includes(booking.status)) {
        return res.status(400).json({ message: 'Cannot submit payment for this booking' });
      }
      if (parseFloat(amount) !== parseFloat(booking.total_price)) {
        return res.status(400).json({ message: 'Payment amount does not match booking total' });
      }

      db.query(
        `INSERT INTO payments (booking_id, amount, method, status) VALUES (?, ?, ?, 'pending')
         ON DUPLICATE KEY UPDATE amount = VALUES(amount), method = VALUES(method), status = 'pending', paid_at = NOW()`,
        [booking_id, amount, method],
        (err, result) => {
          if (err) return res.status(500).json({ message: 'Database error', error: err.message });

          db.query(
            'UPDATE bookings SET status = "payment_pending", id_type = ?, id_number = ?, id_first_name = ?, id_last_name = ?, id_birth_date = ?, id_nationality = ? WHERE id = ?',
            [id_type, id_number, id_first_name, id_last_name, id_birth_date, id_nationality, booking_id]
          );
          db.query('INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
            [user_id, 'Payment Submitted', `Your payment of $${amount} for booking #${booking_id} is awaiting admin confirmation.`, 'payment']);

          res.status(201).json({ message: 'Payment submitted. Awaiting admin confirmation.', payment_id: result.insertId });

          sendBookingReceived(booking.email, booking.name, {
            id: booking_id,
            brand: booking.brand,
            model: booking.model,
            start_date: booking.start_date,
            end_date: booking.end_date,
            total_price: booking.total_price
          }).catch(e => console.error('Booking received email error:', e.message));
        }
      );
    }
  );
});

// Admin confirms payment received
router.put('/:booking_id/confirm-payment', verifyToken, isStaff, (req, res) => {
  const { booking_id } = req.params;

  db.query(
    `SELECT b.*, v.brand, v.model, u.name, u.email,
     pl.name as pickup_location_name, pl.city as pickup_city, pl.address as pickup_address,
     rl.name as return_location_name, rl.city as return_city, rl.address as return_address,
     (SELECT method FROM payments WHERE booking_id = b.id ORDER BY id DESC LIMIT 1) as payment_method
     FROM bookings b
     JOIN vehicles v ON b.vehicle_id = v.id
     JOIN users u ON b.user_id = u.id
     LEFT JOIN locations pl ON b.pickup_location_id = pl.id
     LEFT JOIN locations rl ON b.return_location_id = rl.id
     WHERE b.id = ?`,
    [booking_id],
    (err, results) => {
      if (err) return res.status(500).json({ message: 'Database error' });
      if (results.length === 0) return res.status(404).json({ message: 'Booking not found' });

      const booking = results[0];
      if (booking.status !== 'payment_pending') {
        return res.status(400).json({ message: 'Booking payment is not pending confirmation' });
      }

      db.query('UPDATE bookings SET status = "confirmed" WHERE id = ?', [booking_id], (err) => {
        if (err) return res.status(500).json({ message: 'Database error', error: err.message });

        db.query('UPDATE payments SET status = "completed" WHERE booking_id = ?', [booking_id]);
        db.query('INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
          [booking.user_id, 'Payment Confirmed', `Your payment for booking #${booking_id} has been confirmed. Your booking is now confirmed and awaiting pickup!`, 'payment']);

        sendBookingConfirmation(booking.email, booking.name, {
          id: booking_id,
          brand: booking.brand,
          model: booking.model,
          start_date: booking.start_date,
          end_date: booking.end_date,
          pickup_time: booking.pickup_time || '',
          return_time: booking.return_time || '',
          total_price: booking.total_price,
          payment_method: booking.payment_method || '',
          pickup_location: booking.pickup_location_name ? `${booking.pickup_location_name} — ${booking.pickup_city}` : 'N/A',
          pickup_address: booking.pickup_address || '',
          return_location: booking.return_location_name ? `${booking.return_location_name} — ${booking.return_city}` : 'N/A',
          return_address: booking.return_address || ''
        }).catch(e => console.error('Email error:', e));

        res.json({ message: 'Payment confirmed. Booking is now confirmed.' });
      });
    }
  );
});

// Admin rejects payment (booking goes back to pending)
router.put('/:booking_id/reject-payment', verifyToken, isStaff, (req, res) => {
  const { booking_id } = req.params;
  const { reason } = req.body || {};

  db.query(
    `SELECT b.*, v.brand, v.model, u.name, u.email
     FROM bookings b
     JOIN vehicles v ON b.vehicle_id = v.id
     JOIN users u ON b.user_id = u.id
     WHERE b.id = ?`,
    [booking_id],
    (err, results) => {
      if (err) return res.status(500).json({ message: 'Database error' });
      if (results.length === 0) return res.status(404).json({ message: 'Booking not found' });

      const booking = results[0];
      if (booking.status !== 'payment_pending') {
        return res.status(400).json({ message: 'Booking payment is not pending' });
      }

      db.query('UPDATE bookings SET status = "pending" WHERE id = ?', [booking_id], (err) => {
        if (err) return res.status(500).json({ message: 'Database error' });

        db.query('UPDATE vehicles SET status = "available" WHERE id = ?', [booking.vehicle_id]);
        db.query('UPDATE payments SET status = "failed" WHERE booking_id = ? AND status = "pending"', [booking_id]);
        db.query('INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
          [booking.user_id, 'Payment Rejected',
            `Your payment for booking #${booking_id} was rejected${reason ? ': ' + reason : ''}. Please resubmit with correct information.`,
            'payment']);

        res.json({ message: 'Payment rejected. Booking reset to pending.' });

        sendPaymentRejected(booking.email, booking.name, { id: booking_id, brand: booking.brand, model: booking.model }, reason)
          .then(() => console.log(`Payment rejection email sent to ${booking.email} for booking #${booking_id}`))
          .catch(e => console.error('Payment rejection email error:', e.message));
      });
    }
  );
});

module.exports = router;