const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sendVerificationCode } = require('../config/email');


// REGISTER
exports.register = async (req, res) => {
  const { name, email, password, phone, date_of_birth, city } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email and password are required' });
  }
  if (password.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters' });
  }

  try {
    db.query('SELECT id FROM users WHERE email = ?', [email], async (err, results) => {
      if (err) return res.status(500).json({ message: 'Database error', error: err.message });
      if (results.length > 0) return res.status(400).json({ message: 'Email already registered' });

      const hashedPassword = await bcrypt.hash(password, 10);

      db.query(
        'INSERT INTO users (name, email, password_hash, phone, date_of_birth, city) VALUES (?, ?, ?, ?, ?, ?)',
        [name, email, hashedPassword, phone || null, date_of_birth || null, city || null],
        (err, result) => {
          if (err) return res.status(500).json({ message: 'Database error', error: err.message });
          res.status(201).json({ message: 'Registration successful. Please log in.' });
        }
      );
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// LOGIN - Step 1: verify credentials and send code
exports.login = (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error', error: err.message });
    if (results.length === 0) return res.status(401).json({ message: 'Invalid email or password' });

    try {
      const user = results[0];
      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) return res.status(401).json({ message: 'Invalid email or password' });

      if (user.status === 'suspended') {
        return res.status(403).json({ message: 'Your account has been suspended' });
      }

      // Staff roles skip verification code — log in directly
      if (['admin', 'shop_worker', 'call_center'].includes(user.role)) {
        const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
        return res.json({
          message: 'Login successful',
          token,
          user: { id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone }
        });
      }

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expires = Date.now() + 10 * 60 * 1000;

      db.query(
        'DELETE FROM verification_codes WHERE email = ?',
        [email],
        (delErr) => {
          if (delErr) return res.status(500).json({ message: 'Database error' });
          db.query(
            'INSERT INTO verification_codes (email, code, user_id, expires_at) VALUES (?, ?, ?, ?)',
            [email, code, user.id, expires],
            async (insErr) => {
              if (insErr) return res.status(500).json({ message: 'Database error' });
              try {
                await sendVerificationCode(email, code, user.name);
                res.json({ message: 'Verification code sent to your email', email });
              } catch (emailErr) {
                console.error('Email send error:', emailErr);
                res.status(500).json({ message: 'Failed to send verification email. Please try again.' });
              }
            }
          );
        }
      );
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });
};

// LOGIN - Step 2: verify code and return token
exports.verifyLoginCode = (req, res) => {
  const { email, code } = req.body;

  db.query('SELECT * FROM verification_codes WHERE email = ?', [email], (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error' });
    if (results.length === 0) {
      return res.status(400).json({ message: 'No verification code found. Please login again.' });
    }

    const record = results[0];

    if (Date.now() > record.expires_at) {
      db.query('DELETE FROM verification_codes WHERE email = ?', [email]);
      return res.status(400).json({ message: 'Verification code expired. Please login again.' });
    }
    if (record.code !== code) {
      return res.status(400).json({ message: 'Invalid verification code' });
    }

    db.query('DELETE FROM verification_codes WHERE email = ?', [email]);

    db.query('SELECT * FROM users WHERE id = ?', [record.user_id], (err, userResults) => {
      if (err) return res.status(500).json({ message: 'Database error', error: err.message });
      if (userResults.length === 0) return res.status(404).json({ message: 'User not found' });

      const user = userResults[0];
      const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

      res.json({
        message: 'Login successful',
        token,
        user: { id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone }
      });
    });
  });
};

// GET PROFILE
exports.getProfile = (req, res) => {
  db.query(
    'SELECT id, name, email, phone, date_of_birth, city, role, status, created_at FROM users WHERE id = ?',
    [req.user.id],
    (err, results) => {
      if (err) return res.status(500).json({ message: 'Database error', error: err.message });
      if (results.length === 0) return res.status(404).json({ message: 'User not found' });
      res.json(results[0]);
    }
  );
};

// UPDATE PROFILE
exports.updateProfile = (req, res) => {
  const { name, phone, city } = req.body;
  db.query(
    'UPDATE users SET name = ?, phone = ?, city = ? WHERE id = ?',
    [name, phone, city, req.user.id],
    (err) => {
      if (err) return res.status(500).json({ message: 'Database error', error: err.message });
      res.json({ message: 'Profile updated successfully' });
    }
  );
};

// CHANGE PASSWORD (with history check)
exports.changePassword = async (req, res) => {
  const { current_password, new_password } = req.body;

  if (!current_password || !new_password) {
    return res.status(400).json({ message: 'Both current and new password are required' });
  }
  if (new_password.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters' });
  }

  db.query('SELECT * FROM users WHERE id = ?', [req.user.id], async (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error', error: err.message });
    if (results.length === 0) return res.status(404).json({ message: 'User not found' });

    const user = results[0];
    const isMatch = await bcrypt.compare(current_password, user.password_hash);
    if (!isMatch) return res.status(400).json({ message: 'Current password is incorrect' });

    // Check if new password is same as current
    if (await bcrypt.compare(new_password, user.password_hash)) {
      return res.status(400).json({ message: 'New password cannot be the same as your current password' });
    }

    // Check last 3 passwords from history
    db.query(
      'SELECT password_hash FROM password_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 3',
      [req.user.id],
      async (err, historyResults) => {
        if (err) return res.status(500).json({ message: 'Database error', error: err.message });

        for (const row of historyResults) {
          if (await bcrypt.compare(new_password, row.password_hash)) {
            return res.status(400).json({ message: 'You cannot reuse any of your last 3 passwords' });
          }
        }

        const hashed = await bcrypt.hash(new_password, 10);

        // Save current password to history before updating
        db.query('INSERT INTO password_history (user_id, password_hash) VALUES (?, ?)', [req.user.id, user.password_hash]);

        db.query('UPDATE users SET password_hash = ? WHERE id = ?', [hashed, req.user.id], (err) => {
          if (err) return res.status(500).json({ message: 'Database error', error: err.message });

          // Keep only last 3 in history
          db.query(
            `DELETE FROM password_history WHERE user_id = ? AND id NOT IN (
              SELECT id FROM (SELECT id FROM password_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 3) t
            )`,
            [req.user.id, req.user.id]
          );

          res.json({ message: 'Password changed successfully' });
        });
      }
    );
  });
};