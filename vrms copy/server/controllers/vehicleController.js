const db = require('../config/db');

// GET ALL VEHICLES (with filters)
exports.getAllVehicles = (req, res) => {
  const { category_id, min_price, max_price, status, brand, transmission, page = 1, limit = 100 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let query = `
    SELECT v.*, c.name as category_name,
    (SELECT image_url FROM vehicle_images WHERE vehicle_id = v.id AND is_primary = 1 LIMIT 1) as primary_image
    FROM vehicles v
    LEFT JOIN categories c ON v.category_id = c.id
    WHERE 1=1
  `;
  const params = [];

  if (category_id) { query += ' AND v.category_id = ?'; params.push(category_id); }
  if (min_price) { query += ' AND v.price_per_day >= ?'; params.push(min_price); }
  if (max_price) { query += ' AND v.price_per_day <= ?'; params.push(max_price); }
  if (status) { query += ' AND v.status = ?'; params.push(status); }
  if (brand) { query += ' AND v.brand LIKE ?'; params.push(`%${brand}%`); }
  if (transmission) { query += ' AND v.transmission = ?'; params.push(transmission); }

  query += ' ORDER BY v.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), offset);

  db.query(query, params, (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error', error: err.message });
    res.json(results);
  });
};

// GET SINGLE VEHICLE
exports.getVehicleById = (req, res) => {
  const { id } = req.params;

  db.query(
    `SELECT v.*, c.name as category_name 
     FROM vehicles v 
     LEFT JOIN categories c ON v.category_id = c.id 
     WHERE v.id = ?`,
    [id],
    (err, results) => {
      if (err) return res.status(500).json({ message: 'Database error', error: err.message });
      if (results.length === 0) return res.status(404).json({ message: 'Vehicle not found' });

      const vehicle = results[0];

      // Get images
      db.query('SELECT * FROM vehicle_images WHERE vehicle_id = ?', [id], (err, images) => {
        if (err) return res.status(500).json({ message: 'Database error', error: err.message });
        vehicle.images = images;

        // Get reviews
        db.query(
          `SELECT r.*, u.name as user_name 
           FROM reviews r 
           JOIN users u ON r.user_id = u.id 
           WHERE r.vehicle_id = ? 
           ORDER BY r.created_at DESC`,
          [id],
          (err, reviews) => {
            if (err) return res.status(500).json({ message: 'Database error', error: err.message });
            vehicle.reviews = reviews;
            res.json(vehicle);
          }
        );
      });
    }
  );
};

// CREATE VEHICLE (admin only)
exports.createVehicle = (req, res) => {
  const { category_id, brand, model, year, plate_number, price_per_day, description } = req.body;

  if (!category_id || !brand || !model || !price_per_day) {
    return res.status(400).json({ message: 'Category, brand, model and price are required' });
  }

  db.query(
    'INSERT INTO vehicles (category_id, brand, model, year, plate_number, price_per_day, description) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [category_id, brand, model, year || null, plate_number || null, price_per_day, description || null],
    (err, result) => {
      if (err) return res.status(500).json({ message: 'Database error', error: err.message });
      res.status(201).json({ message: 'Vehicle created successfully', id: result.insertId });
    }
  );
};

// UPDATE VEHICLE (admin only)
exports.updateVehicle = (req, res) => {
  const { id } = req.params;
  const { category_id, brand, model, year, plate_number, price_per_day, status, description } = req.body;

  db.query(
    `UPDATE vehicles SET 
      category_id = COALESCE(?, category_id),
      brand = COALESCE(?, brand),
      model = COALESCE(?, model),
      year = COALESCE(?, year),
      plate_number = COALESCE(?, plate_number),
      price_per_day = COALESCE(?, price_per_day),
      status = COALESCE(?, status),
      description = COALESCE(?, description)
     WHERE id = ?`,
    [category_id, brand, model, year, plate_number, price_per_day, status, description, id],
    (err, result) => {
      if (err) return res.status(500).json({ message: 'Database error', error: err.message });
      if (result.affectedRows === 0) return res.status(404).json({ message: 'Vehicle not found' });
      res.json({ message: 'Vehicle updated successfully' });
    }
  );
};

// DELETE VEHICLE (admin only)
exports.deleteVehicle = (req, res) => {
  const { id } = req.params;

  db.query('DELETE FROM vehicles WHERE id = ?', [id], (err, result) => {
    if (err) return res.status(500).json({ message: 'Database error', error: err.message });
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Vehicle not found' });
    res.json({ message: 'Vehicle deleted successfully' });
  });
};

// UPLOAD VEHICLE IMAGE
exports.uploadVehicleImage = (req, res) => {
  const { id } = req.params;
  if (!req.file) return res.status(400).json({ message: 'No image file provided' });
  const imageUrl = `/uploads/${req.file.filename}`;
  db.query('SELECT id FROM vehicle_images WHERE vehicle_id = ? AND is_primary = 1', [id], (err, existing) => {
    if (err) return res.status(500).json({ message: 'Database error', error: err.message });
    const isPrimary = existing.length === 0 ? 1 : 0;
    db.query(
      'INSERT INTO vehicle_images (vehicle_id, image_url, is_primary) VALUES (?, ?, ?)',
      [id, imageUrl, isPrimary],
      (err, result) => {
        if (err) return res.status(500).json({ message: 'Database error', error: err.message });
        res.status(201).json({ message: 'Image uploaded', image_url: imageUrl, id: result.insertId });
      }
    );
  });
};

// GET ALL CATEGORIES
exports.getCategories = (req, res) => {
  db.query('SELECT * FROM categories', (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error', error: err.message });
    res.json(results);
  });
};

