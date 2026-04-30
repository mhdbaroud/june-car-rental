const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verifyToken } = require('../middleware/auth');

// GET /api/saved-cards
router.get('/', verifyToken, (req, res) => {
  db.query(
    'SELECT id, card_name, card_number, last_four, expiry, card_type FROM saved_cards WHERE user_id = ? ORDER BY created_at DESC',
    [req.user.id],
    (err, results) => {
      if (err) return res.status(500).json({ message: err.message });
      res.json(results);
    }
  );
});

const isExpiryValid = (expiry) => {
  const parts = (expiry || '').split('/');
  if (parts.length !== 2) return false;
  const [mm, yy] = parts;
  if (mm.length !== 2 || yy.length !== 2) return false;
  const month = parseInt(mm, 10);
  const year = 2000 + parseInt(yy, 10);
  if (month < 1 || month > 12) return false;
  return new Date(year, month, 1) > new Date();
};

// POST /api/saved-cards
router.post('/', verifyToken, (req, res) => {
  const { card_name, card_number, last_four, expiry, card_type } = req.body;
  if (!card_name || !last_four || !expiry) {
    return res.status(400).json({ message: 'Missing card details' });
  }
  if (!isExpiryValid(expiry)) {
    return res.status(400).json({ message: 'Card has expired or expiry date is invalid' });
  }
  db.query('SELECT COUNT(*) as count FROM saved_cards WHERE user_id = ?', [req.user.id], (err, results) => {
    if (err) return res.status(500).json({ message: err.message });
    if (results[0].count >= 5) {
      return res.status(400).json({ message: 'Maximum 5 saved cards allowed' });
    }
    db.query(
      'SELECT id FROM saved_cards WHERE user_id = ? AND last_four = ? AND expiry = ?',
      [req.user.id, last_four, expiry],
      (err, existing) => {
        if (err) return res.status(500).json({ message: err.message });
        if (existing.length > 0) {
          return res.status(409).json({ message: 'Card already saved' });
        }
        db.query(
          'INSERT INTO saved_cards (user_id, card_name, card_number, last_four, expiry, card_type) VALUES (?, ?, ?, ?, ?, ?)',
          [req.user.id, card_name, card_number || '', last_four, expiry, card_type || 'Card'],
          (err, result) => {
            if (err) return res.status(500).json({ message: err.message });
            res.status(201).json({ id: result.insertId, card_name, card_number: card_number || '', last_four, expiry, card_type });
          }
        );
      }
    );
  });
});

// DELETE /api/saved-cards/:id
router.delete('/:id', verifyToken, (req, res) => {
  db.query(
    'DELETE FROM saved_cards WHERE id = ? AND user_id = ?',
    [req.params.id, req.user.id],
    (err, result) => {
      if (err) return res.status(500).json({ message: err.message });
      if (result.affectedRows === 0) return res.status(404).json({ message: 'Card not found' });
      res.json({ message: 'Card removed' });
    }
  );
});

module.exports = router;
