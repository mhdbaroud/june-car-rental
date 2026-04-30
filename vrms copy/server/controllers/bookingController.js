const db = require('../config/db');
const {
  sendBookingReceived,
  sendCancellationRequest,
  sendCancellationApproved,
  sendCancellationRejected
} = require('../config/email');
const { broadcast } = require('../config/sse');

// CHECK AVAILABILITY
const checkAvailability = (vehicle_id, start_date, end_date, exclude_booking_id = null) => {
  return new Promise((resolve, reject) => {
    let query = `
      SELECT id FROM bookings 
      WHERE vehicle_id = ? 
      AND status NOT IN ('cancelled', 'cancellation_requested') 
      AND (start_date <= ? AND end_date >= ?)
    `;
    const params = [vehicle_id, end_date, start_date];
    if (exclude_booking_id) { query += ' AND id != ?'; params.push(exclude_booking_id); }
    db.query(query, params, (err, results) => {
      if (err) return reject(err);
      resolve(results.length === 0);
    });
  });
};

// CREATE BOOKING
exports.createBooking = async (req, res) => {
  const { vehicle_id, start_date, end_date, extras, pickup_location_id, return_location_id, pickup_time, return_time } = req.body;
  const user_id = req.user.id;

  if (!vehicle_id || !start_date || !end_date) {
    return res.status(400).json({ message: 'Vehicle, start date and end date are required' });
  }

  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  if (start_date === todayStr) {
    if (!pickup_time) {
      return res.status(400).json({ message: 'Pickup time is required for same-day bookings' });
    }
    const [pickupHour, pickupMin] = pickup_time.split(':').map(Number);
    const minAllowed = new Date(now.getTime() + 3 * 60 * 60 * 1000);
    const pickupDate = new Date(now);
    pickupDate.setHours(pickupHour, pickupMin, 0, 0);
    if (pickupDate < minAllowed) {
      const eh = pad(minAllowed.getHours());
      const em = pad(minAllowed.getMinutes());
      return res.status(400).json({ message: `Same-day bookings require at least 3 hours notice. Earliest pickup today is ${eh}:${em}.` });
    }
  }

  db.query('SELECT date_of_birth, name, email FROM users WHERE id = ?', [user_id], async (err, userResults) => {
    if (err) return res.status(500).json({ message: 'Database error', error: err.message });

    if (userResults.length > 0 && userResults[0].date_of_birth) {
      const dob = new Date(userResults[0].date_of_birth);
      const age = Math.floor((new Date() - dob) / (365.25 * 24 * 60 * 60 * 1000));
      if (age < 21) return res.status(403).json({ message: 'You must be at least 21 years old to rent a vehicle' });
    }

    const customerName = userResults[0]?.name;
    const customerEmail = userResults[0]?.email;

    try {
      const isAvailable = await checkAvailability(vehicle_id, start_date, end_date);
      if (!isAvailable) return res.status(400).json({ message: 'Vehicle is not available for selected dates' });

      db.query('SELECT price_per_day, status, brand, model FROM vehicles WHERE id = ?', [vehicle_id], async (err, vehicleResults) => {
        if (err) return res.status(500).json({ message: 'Database error', error: err.message });
        if (vehicleResults.length === 0) return res.status(404).json({ message: 'Vehicle not found' });
        if (vehicleResults[0].status === 'maintenance') return res.status(400).json({ message: 'Vehicle is currently under maintenance and cannot be booked' });

        const days = Math.ceil((new Date(end_date) - new Date(start_date)) / (1000 * 60 * 60 * 24));
        if (days <= 0) return res.status(400).json({ message: 'End date must be after start date' });

        let total_price = vehicleResults[0].price_per_day * days;
        let extrasData = [];

        if (extras && extras.length > 0) {
          for (const extra of extras) {
            const extraResult = await new Promise((resolve, reject) => {
              db.query('SELECT * FROM extras WHERE id = ? AND is_active = 1', [extra.id], (err, results) => {
                if (err) reject(err); else resolve(results);
              });
            });
            if (extraResult.length > 0) {
              const extraPrice = extraResult[0].price_per_day * days * (extra.quantity || 1);
              total_price += extraPrice;
              extrasData.push({ id: extra.id, quantity: extra.quantity || 1, price: extraPrice });
            }
          }
        }

        db.query(
          `INSERT INTO bookings (user_id, vehicle_id, start_date, end_date, total_price, pickup_location_id, return_location_id, pickup_time, return_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [user_id, vehicle_id, start_date, end_date, total_price, pickup_location_id || null, return_location_id || null, pickup_time || null, return_time || null],
          (err, result) => {
            if (err) return res.status(500).json({ message: 'Database error', error: err.message });

            const booking_id = result.insertId;
            if (extrasData.length > 0) {
              const extraValues = extrasData.map(e => [booking_id, e.id, e.quantity, e.price]);
              db.query('INSERT INTO booking_extras (booking_id, extra_id, quantity, price) VALUES ?', [extraValues]);
            }
            db.query('INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
              [user_id, 'Booking Received', `Your booking #${booking_id} has been received. Please proceed to payment.`, 'booking']);

            broadcast('new_booking', { booking_id, customer: customerName, status: 'pending', total_price });

            res.status(201).json({ message: 'Booking created successfully', booking_id, total_price });
          }
        );
      });
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });
};

// CREATE BOOKING + SUBMIT PAYMENT IN ONE STEP
const VALID_ID_TYPES = ['national_id', 'passport', 'driver_license', 'residence_permit'];

exports.createAndCompleteBooking = async (req, res) => {
  const {
    vehicle_id, start_date, end_date, extras,
    pickup_location_id, return_location_id, pickup_time, return_time,
    method, id_type, id_number, id_first_name, id_last_name, id_birth_date, id_nationality
  } = req.body;
  const user_id = req.user.id;

  if (!vehicle_id || !start_date || !end_date)
    return res.status(400).json({ message: 'Vehicle, start date and end date are required' });
  if (!id_type || !id_number || !id_first_name || !id_last_name || !id_birth_date || !id_nationality)
    return res.status(400).json({ message: 'All ID fields are required' });
  if (!VALID_ID_TYPES.includes(id_type))
    return res.status(400).json({ message: 'Invalid ID type' });

  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  if (start_date === todayStr) {
    if (!pickup_time) return res.status(400).json({ message: 'Pickup time is required for same-day bookings' });
    const [ph, pm] = pickup_time.split(':').map(Number);
    const minAllowed = new Date(now.getTime() + 3 * 60 * 60 * 1000);
    const pickupDate = new Date(now);
    pickupDate.setHours(ph, pm, 0, 0);
    if (pickupDate < minAllowed)
      return res.status(400).json({ message: `Same-day bookings require at least 3 hours notice. Earliest pickup today is ${pad(minAllowed.getHours())}:${pad(minAllowed.getMinutes())}.` });
  }

  db.query('SELECT date_of_birth, name, email FROM users WHERE id = ?', [user_id], async (err, userResults) => {
    if (err) return res.status(500).json({ message: 'Database error' });

    if (userResults.length > 0 && userResults[0].date_of_birth) {
      const dob = new Date(userResults[0].date_of_birth);
      const age = Math.floor((new Date() - dob) / (365.25 * 24 * 60 * 60 * 1000));
      if (age < 21) return res.status(403).json({ message: 'You must be at least 21 years old to rent a vehicle' });
    }

    try {
      const isAvailable = await checkAvailability(vehicle_id, start_date, end_date);
      if (!isAvailable) return res.status(400).json({ message: 'Vehicle is not available for selected dates' });

      db.query('SELECT price_per_day, status, brand, model FROM vehicles WHERE id = ?', [vehicle_id], async (err, vehicleResults) => {
        if (err) return res.status(500).json({ message: 'Database error' });
        if (!vehicleResults.length) return res.status(404).json({ message: 'Vehicle not found' });
        if (vehicleResults[0].status === 'maintenance') return res.status(400).json({ message: 'Vehicle is currently under maintenance and cannot be booked' });

        const days = Math.ceil((new Date(end_date) - new Date(start_date)) / (1000 * 60 * 60 * 24));
        if (days <= 0) return res.status(400).json({ message: 'End date must be after start date' });

        let total_price = vehicleResults[0].price_per_day * days;
        const extrasData = [];
        if (extras && extras.length > 0) {
          for (const extra of extras) {
            const rows = await new Promise((resolve, reject) => {
              db.query('SELECT * FROM extras WHERE id = ? AND is_active = 1', [extra.id], (e, r) => e ? reject(e) : resolve(r));
            });
            if (rows.length > 0) {
              const ep = rows[0].price_per_day * days * (extra.quantity || 1);
              total_price += ep;
              extrasData.push({ id: extra.id, quantity: extra.quantity || 1, price: ep });
            }
          }
        }

        db.query(
          `INSERT INTO bookings
           (user_id, vehicle_id, start_date, end_date, total_price,
            pickup_location_id, return_location_id, pickup_time, return_time, status,
            id_type, id_number, id_first_name, id_last_name, id_birth_date, id_nationality)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'payment_pending', ?, ?, ?, ?, ?, ?)`,
          [user_id, vehicle_id, start_date, end_date, total_price,
           pickup_location_id || null, return_location_id || null, pickup_time || null, return_time || null,
           id_type, id_number, id_first_name, id_last_name, id_birth_date, id_nationality],
          (err, result) => {
            if (err) return res.status(500).json({ message: 'Database error', error: err.message });

            const booking_id = result.insertId;
            if (extrasData.length > 0) {
              db.query('INSERT INTO booking_extras (booking_id, extra_id, quantity, price) VALUES ?',
                [extrasData.map(e => [booking_id, e.id, e.quantity, e.price])]);
            }
            db.query(`INSERT INTO payments (booking_id, amount, method, status) VALUES (?, ?, ?, 'pending')`,
              [booking_id, total_price, method || 'cash']);
            db.query('INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
              [user_id, 'Booking Submitted', `Your booking #${booking_id} has been submitted and is awaiting admin confirmation.`, 'booking']);

            broadcast('new_booking', { booking_id, customer: userResults[0]?.name, status: 'payment_pending', total_price });

            res.status(201).json({ message: 'Booking submitted successfully', booking_id, total_price });

            sendBookingReceived(userResults[0].email, userResults[0].name, {
              id: booking_id, brand: vehicleResults[0].brand, model: vehicleResults[0].model,
              start_date, end_date, total_price
            }).catch(e => console.error('Booking received email error:', e.message));
          }
        );
      });
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });
};

// GET USER BOOKINGS
exports.getUserBookings = (req, res) => {
  const user_id = req.user.id;
  db.query(
    `SELECT b.*, v.brand, v.model, v.plate_number, v.price_per_day, v.year,
     (SELECT image_url FROM vehicle_images WHERE vehicle_id = v.id AND is_primary = 1 LIMIT 1) as vehicle_image,
     pl.name as pickup_location_name, pl.city as pickup_city, pl.address as pickup_address,
     rl.name as return_location_name, rl.city as return_city, rl.address as return_address,
     u.email as customer_email,
     (SELECT method FROM payments WHERE booking_id = b.id ORDER BY id DESC LIMIT 1) as payment_method
     FROM bookings b
     JOIN vehicles v ON b.vehicle_id = v.id
     JOIN users u ON b.user_id = u.id
     LEFT JOIN locations pl ON b.pickup_location_id = pl.id
     LEFT JOIN locations rl ON b.return_location_id = rl.id
     WHERE b.user_id = ?
     ORDER BY b.created_at DESC`,
    [user_id],
    (err, results) => {
      if (err) return res.status(500).json({ message: 'Database error', error: err.message });
      res.json(results);
    }
  );
};

// GET ALL BOOKINGS (admin)
exports.getAllBookings = (req, res) => {
  db.query(
    `SELECT b.*, v.brand, v.model, v.plate_number, v.price_per_day, v.year,
     u.name as customer_name, u.email as customer_email,
     pl.name as pickup_location_name, pl.city as pickup_city, pl.address as pickup_address,
     rl.name as return_location_name, rl.city as return_city, rl.address as return_address,
     (SELECT method FROM payments WHERE booking_id = b.id ORDER BY id DESC LIMIT 1) as payment_method,
     (SELECT reason FROM booking_cancellations WHERE booking_id = b.id ORDER BY id DESC LIMIT 1) as cancellation_reason,
     (SELECT JSON_ARRAYAGG(JSON_OBJECT('name', e.name, 'quantity', be.quantity, 'price', be.price))
      FROM booking_extras be JOIN extras e ON be.extra_id = e.id
      WHERE be.booking_id = b.id) as extras
     FROM bookings b
     JOIN vehicles v ON b.vehicle_id = v.id
     JOIN users u ON b.user_id = u.id
     LEFT JOIN locations pl ON b.pickup_location_id = pl.id
     LEFT JOIN locations rl ON b.return_location_id = rl.id
     ORDER BY b.created_at DESC`,
    (err, results) => {
      if (err) return res.status(500).json({ message: 'Database error', error: err.message });
      res.json(results);
    }
  );
};

// GET SINGLE BOOKING
exports.getBookingById = (req, res) => {
  const { id } = req.params;
  const user_id = req.user.id;
  const role = req.user.role;

  let query = `
    SELECT b.*, v.brand, v.model, v.plate_number, v.price_per_day,
    u.name as customer_name, u.email as customer_email,
    pl.name as pickup_location_name, pl.city as pickup_city, pl.address as pickup_address,
    rl.name as return_location_name, rl.city as return_city, rl.address as return_address,
    (SELECT method FROM payments WHERE booking_id = b.id ORDER BY id DESC LIMIT 1) as payment_method
    FROM bookings b
    JOIN vehicles v ON b.vehicle_id = v.id
    JOIN users u ON b.user_id = u.id
    LEFT JOIN locations pl ON b.pickup_location_id = pl.id
    LEFT JOIN locations rl ON b.return_location_id = rl.id
    WHERE b.id = ?
  `;
  const params = [id];
  if (role === 'customer') { query += ' AND b.user_id = ?'; params.push(user_id); }

  db.query(query, params, (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error', error: err.message });
    if (results.length === 0) return res.status(404).json({ message: 'Booking not found' });
    res.json(results[0]);
  });
};

// GET BOOKED DATES FOR A VEHICLE (public)
exports.getBookedDates = (req, res) => {
  const { vehicle_id } = req.params;
  db.query(
    `SELECT start_date, end_date FROM bookings WHERE vehicle_id = ? AND status NOT IN ('cancelled', 'cancellation_requested') AND end_date >= CURDATE()`,
    [vehicle_id],
    (err, results) => {
      if (err) return res.status(500).json({ message: 'Database error', error: err.message });
      res.json(results);
    }
  );
};

// REQUEST CANCELLATION (customer)
exports.requestCancellation = (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  const user_id = req.user.id;

  db.query(
    `SELECT b.*, v.brand, v.model, u.name, u.email FROM bookings b 
     JOIN vehicles v ON b.vehicle_id = v.id JOIN users u ON b.user_id = u.id
     WHERE b.id = ? AND b.user_id = ?`,
    [id, user_id],
    (err, results) => {
      if (err) return res.status(500).json({ message: 'Database error', error: err.message });
      if (results.length === 0) return res.status(404).json({ message: 'Booking not found' });

      const booking = results[0];
      if (!['pending', 'confirmed', 'active', 'payment_pending'].includes(booking.status)) {
        return res.status(400).json({ message: `Cannot request cancellation for a booking with status: ${booking.status}` });
      }

      db.query('UPDATE bookings SET status = "cancellation_requested" WHERE id = ?', [id], (err) => {
        if (err) return res.status(500).json({ message: 'Database error', error: err.message });

        db.query('INSERT INTO booking_cancellations (booking_id, cancelled_by, reason) VALUES (?, ?, ?)', [id, user_id, reason || null]);
        db.query('INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
          [user_id, 'Cancellation Requested', `Your cancellation request for booking #${id} has been submitted.`, 'booking']);

        sendCancellationRequest(booking.email, booking.name, { id, brand: booking.brand, model: booking.model })
          .catch(e => console.error('Email error:', e));

        res.json({ message: 'Cancellation request submitted. Awaiting admin approval.' });
      });
    }
  );
};

// APPROVE CANCELLATION (admin)
exports.approveCancellation = (req, res) => {
  const { id } = req.params;
  db.query(
    `SELECT b.*, v.brand, v.model, u.name, u.email FROM bookings b 
     JOIN vehicles v ON b.vehicle_id = v.id JOIN users u ON b.user_id = u.id WHERE b.id = ?`,
    [id],
    (err, results) => {
      if (err) return res.status(500).json({ message: 'Database error', error: err.message });
      if (results.length === 0) return res.status(404).json({ message: 'Booking not found' });

      const booking = results[0];
      if (booking.status !== 'cancellation_requested') return res.status(400).json({ message: 'Booking is not pending cancellation approval' });

      db.query('UPDATE bookings SET status = "cancelled" WHERE id = ?', [id], (err) => {
        if (err) return res.status(500).json({ message: 'Database error', error: err.message });

        db.query('UPDATE vehicles SET status = "available" WHERE id = ?', [booking.vehicle_id]);
        db.query('INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
          [booking.user_id, 'Cancellation Approved', `Your cancellation request for booking #${id} has been approved.`, 'booking']);

        sendCancellationApproved(booking.email, booking.name, { id, brand: booking.brand, model: booking.model })
          .catch(e => console.error('Email error:', e));

        res.json({ message: 'Cancellation approved. Booking is now cancelled.' });
      });
    }
  );
};

// REJECT CANCELLATION (admin)
exports.rejectCancellation = (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  db.query(
    `SELECT b.*, v.brand, v.model, u.name, u.email FROM bookings b 
     JOIN vehicles v ON b.vehicle_id = v.id JOIN users u ON b.user_id = u.id WHERE b.id = ?`,
    [id],
    (err, results) => {
      if (err) return res.status(500).json({ message: 'Database error', error: err.message });
      if (results.length === 0) return res.status(404).json({ message: 'Booking not found' });

      const booking = results[0];
      if (booking.status !== 'cancellation_requested') return res.status(400).json({ message: 'Booking is not pending cancellation approval' });

      db.query('UPDATE bookings SET status = "confirmed" WHERE id = ?', [id], (err) => {
        if (err) return res.status(500).json({ message: 'Database error', error: err.message });

        db.query('INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
          [booking.user_id, 'Cancellation Rejected', `Your cancellation request for booking #${id} has been rejected${reason ? ': ' + reason : '.'}`, 'booking']);

        sendCancellationRejected(booking.email, booking.name, { id, brand: booking.brand, model: booking.model }, reason)
          .catch(e => console.error('Email error:', e));

        res.json({ message: 'Cancellation request rejected. Booking remains confirmed.' });
      });
    }
  );
};

// CANCEL BOOKING DIRECTLY (admin only)
exports.cancelBooking = (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  const admin_id = req.user.id;

  db.query(
    `SELECT b.*, v.brand, v.model, u.name, u.email FROM bookings b
     JOIN vehicles v ON b.vehicle_id = v.id
     JOIN users u ON b.user_id = u.id
     WHERE b.id = ?`,
    [id],
    (err, results) => {
      if (err) return res.status(500).json({ message: 'Database error', error: err.message });
      if (results.length === 0) return res.status(404).json({ message: 'Booking not found' });

      const booking = results[0];
      if (booking.status === 'cancelled') return res.status(400).json({ message: 'Booking is already cancelled' });

      db.query('UPDATE bookings SET status = "cancelled" WHERE id = ?', [id], (err) => {
        if (err) return res.status(500).json({ message: 'Database error', error: err.message });

        db.query('INSERT INTO booking_cancellations (booking_id, cancelled_by, reason) VALUES (?, ?, ?)', [id, admin_id, reason || null]);
        db.query('UPDATE vehicles SET status = "available" WHERE id = ?', [booking.vehicle_id]);
        db.query('INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
          [booking.user_id, 'Booking Cancelled', `Your booking #${id} has been cancelled by the administrator.`, 'booking']);

        res.json({ message: 'Booking cancelled successfully' });

        sendCancellationApproved(booking.email, booking.name, { id, brand: booking.brand, model: booking.model })
          .catch(e => console.error('Cancel email error:', e.message));
      });
    }
  );
};

// EXTEND BOOKING
exports.extendBooking = (req, res) => {
  const { id } = req.params;
  const { new_end_date } = req.body;
  const user_id = req.user.id;

  db.query('SELECT * FROM bookings WHERE id = ? AND user_id = ? AND status = "confirmed"', [id, user_id], async (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error', error: err.message });
    if (results.length === 0) return res.status(404).json({ message: 'Booking not found or cannot be extended' });

    const booking = results[0];
    const isAvailable = await checkAvailability(booking.vehicle_id, booking.end_date, new_end_date, id);
    if (!isAvailable) return res.status(400).json({ message: 'Vehicle is not available for the extended dates' });

    db.query('SELECT price_per_day FROM vehicles WHERE id = ?', [booking.vehicle_id], (err, vehicleResults) => {
      if (err) return res.status(500).json({ message: 'Database error', error: err.message });

      const extraDays = Math.ceil((new Date(new_end_date) - new Date(booking.end_date)) / (1000 * 60 * 60 * 24));
      if (extraDays <= 0) return res.status(400).json({ message: 'New end date must be after current end date' });

      const extra_charge = vehicleResults[0].price_per_day * extraDays;
      db.query('UPDATE bookings SET end_date = ? WHERE id = ?', [new_end_date, id], (err) => {
        if (err) return res.status(500).json({ message: 'Database error', error: err.message });
        db.query('INSERT INTO booking_extensions (booking_id, new_end_date, extra_charge) VALUES (?, ?, ?)', [id, new_end_date, extra_charge]);
        res.json({ message: 'Booking extended successfully', extra_charge, new_end_date });
      });
    });
  });
};