const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const db = require('./config/db');
const authRoutes = require('./routes/auth');
const vehicleRoutes = require('./routes/vehicles');
const bookingRoutes = require('./routes/bookings');
const extrasRoutes = require('./routes/extras');
const adminRoutes = require('./routes/admin');
const paymentRoutes = require('./routes/payments');
const locationRoutes = require('./routes/locations');
const savedCardsRoutes = require('./routes/savedCards');
const savedIdsRoutes = require('./routes/savedIds');

const app = express();

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (
      /^https?:\/\/localhost(:\d+)?$/.test(origin) ||
      /^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin) ||
      origin === (process.env.CLIENT_URL || 'http://localhost:3000') ||
      origin.endsWith('.ngrok-free.app') ||
      origin.endsWith('.ngrok-free.dev') ||
      origin.endsWith('.ngrok.io')
    ) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/extras', extrasRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/saved-cards', savedCardsRoutes);
app.use('/api/saved-ids', savedIdsRoutes);

// Serve React build
const clientBuild = path.join(__dirname, '../client/build');
app.use(express.static(clientBuild));
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ message: 'API route not found' });
  res.sendFile(path.join(clientBuild, 'index.html'));
});

// Global JSON error handler (prevents Express 5 from returning HTML on errors)
app.use((err, req, res, next) => {
  console.error('Server error:', err.message);
  res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
});

// ID verification columns (errno 1060 = duplicate column, safe to ignore)
['id_type VARCHAR(50)','id_number VARCHAR(100)','id_first_name VARCHAR(100)','id_last_name VARCHAR(100)','id_birth_date DATE','id_nationality VARCHAR(100)']
  .forEach(col => db.query(`ALTER TABLE bookings ADD COLUMN ${col}`, (err) => {
    if (err && err.errno !== 1060) console.error('ALTER bookings:', err.message);
  }));

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});