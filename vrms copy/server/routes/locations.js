const express = require('express');
const router = express.Router();
const db = require('../config/db');

router.get('/', (req, res) => {
  db.query('SELECT * FROM locations WHERE is_active = 1 ORDER BY city', (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error' });
    res.json(results);
  });
});

router.get('/cities', (req, res) => {
  db.query('SELECT DISTINCT city FROM locations WHERE is_active = 1 ORDER BY city', (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error' });
    res.json(results.map(r => r.city));
  });
});

router.get('/:city', (req, res) => {
  db.query('SELECT * FROM locations WHERE city = ? AND is_active = 1', [req.params.city], (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error' });
    res.json(results);
  });
});

module.exports = router;