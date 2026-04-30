const db = require('../config/db');
const bcrypt = require('bcryptjs');
const { sendPasswordReset } = require('../config/email');

// FORGOT PASSWORD — generate token and send email
exports.forgotPassword = (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is required' });

  db.query('SELECT id, name FROM users WHERE email = ?', [email], (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error' });
    if (results.length === 0) return res.status(404).json({ message: 'No account found with this email' });

    const user = results[0];
    const token = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    db.query('UPDATE password_reset_tokens SET is_used = 1 WHERE user_id = ?', [user.id]);

    db.query(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
      [user.id, token, expiresAt],
      (err) => {
        if (err) return res.status(500).json({ message: 'Database error', error: err.message });

        sendPasswordReset(email, user.name, token)
          .then(() => res.json({ message: 'Reset code sent to your email' }))
          .catch(e => {
            console.error('Email error:', e);
            res.status(500).json({ message: 'Failed to send email' });
          });
      }
    );
  });
};

// RESET PASSWORD — verify token, check history, update password
exports.resetPassword = (req, res) => {
  const { email, token, new_password } = req.body;
  if (!email || !token || !new_password) {
    return res.status(400).json({ message: 'Email, token and new password are required' });
  }
  if (new_password.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters' });
  }

  db.query('SELECT id, password_hash FROM users WHERE email = ?', [email], (err, userResults) => {
    if (err) return res.status(500).json({ message: 'Database error' });
    if (userResults.length === 0) return res.status(404).json({ message: 'User not found' });

    const user = userResults[0];

    db.query(
      `SELECT * FROM password_reset_tokens 
       WHERE user_id = ? AND token = ? AND is_used = 0 AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [user.id, token],
      (err, tokenResults) => {
        if (err) return res.status(500).json({ message: 'Database error' });
        if (tokenResults.length === 0) {
          return res.status(400).json({ message: 'Invalid or expired reset code' });
        }

        // Check current password
        if (bcrypt.compareSync(new_password, user.password_hash)) {
          return res.status(400).json({ message: 'New password cannot be the same as your current password' });
        }

        // Check last 3 passwords from history
        db.query(
          'SELECT password_hash FROM password_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 3',
          [user.id],
          (err, historyResults) => {
            if (err) return res.status(500).json({ message: 'Database error' });

            for (const row of historyResults) {
              if (bcrypt.compareSync(new_password, row.password_hash)) {
                return res.status(400).json({ message: 'You cannot reuse any of your last 3 passwords' });
              }
            }

            const hashedPassword = bcrypt.hashSync(new_password, 10);

            // Save current password to history before updating
            db.query('INSERT INTO password_history (user_id, password_hash) VALUES (?, ?)', [user.id, user.password_hash]);

            // Update password
            db.query('UPDATE users SET password_hash = ? WHERE id = ?', [hashedPassword, user.id], (err) => {
              if (err) return res.status(500).json({ message: 'Database error' });

              // Mark token as used
              db.query('UPDATE password_reset_tokens SET is_used = 1 WHERE id = ?', [tokenResults[0].id]);

              // Keep only last 3 in history
              db.query(
                `DELETE FROM password_history WHERE user_id = ? AND id NOT IN (
                  SELECT id FROM (SELECT id FROM password_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 3) t
                )`,
                [user.id, user.id]
              );

              res.json({ message: 'Password reset successfully' });
            });
          }
        );
      }
    );
  });
};