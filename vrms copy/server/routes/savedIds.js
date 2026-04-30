const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verifyToken } = require('../middleware/auth');

// GET /api/saved-ids
router.get('/', verifyToken, (req, res) => {
  db.query(
    'SELECT id, id_label, id_type, id_number, id_first_name, id_last_name, id_birth_date, id_nationality FROM saved_ids WHERE user_id = ? ORDER BY created_at DESC',
    [req.user.id],
    (err, results) => {
      if (err) return res.status(500).json({ message: err.message });
      res.json(results);
    }
  );
});

// POST /api/saved-ids
router.post('/', verifyToken, (req, res) => {
  const { id_label, id_type, id_number, id_first_name, id_last_name, id_birth_date, id_nationality } = req.body;
  if (!id_type || !id_number || !id_first_name || !id_last_name || !id_birth_date || !id_nationality) {
    return res.status(400).json({ message: 'Missing ID details' });
  }
  db.query('SELECT COUNT(*) as count FROM saved_ids WHERE user_id = ?', [req.user.id], (err, results) => {
    if (err) return res.status(500).json({ message: err.message });
    if (results[0].count >= 5) {
      return res.status(400).json({ message: 'Maximum 5 saved IDs allowed' });
    }
    db.query(
      'SELECT id FROM saved_ids WHERE user_id = ? AND id_number = ? AND id_type = ?',
      [req.user.id, id_number, id_type],
      (err, existing) => {
        if (err) return res.status(500).json({ message: err.message });
        if (existing.length > 0) {
          return res.status(409).json({ message: 'ID already saved' });
        }
        db.query(
          'INSERT INTO saved_ids (user_id, id_label, id_type, id_number, id_first_name, id_last_name, id_birth_date, id_nationality) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [req.user.id, id_label || `${id_first_name} ${id_last_name}`, id_type, id_number, id_first_name, id_last_name, id_birth_date, id_nationality],
          (err, result) => {
            if (err) return res.status(500).json({ message: err.message });
            res.status(201).json({ id: result.insertId, id_label: id_label || `${id_first_name} ${id_last_name}`, id_type, id_number, id_first_name, id_last_name, id_birth_date, id_nationality });
          }
        );
      }
    );
  });
});

// DELETE /api/saved-ids/:id
router.delete('/:id', verifyToken, (req, res) => {
  db.query(
    'DELETE FROM saved_ids WHERE id = ? AND user_id = ?',
    [req.params.id, req.user.id],
    (err, result) => {
      if (err) return res.status(500).json({ message: err.message });
      if (result.affectedRows === 0) return res.status(404).json({ message: 'ID not found' });
      res.json({ message: 'ID removed' });
    }
  );
});

module.exports = router;
