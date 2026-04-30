const mysql = require('mysql2');
const dotenv = require('dotenv');

dotenv.config();

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

db.getConnection((err, connection) => {
  if (err) {
    console.error('Database connection failed:', err.message);
    return;
  }
  console.log('Connected to MySQL database!');

  const tables = [
    `CREATE TABLE IF NOT EXISTS saved_ids (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      id_label VARCHAR(100) NOT NULL,
      id_type VARCHAR(50) NOT NULL,
      id_number VARCHAR(100) NOT NULL,
      id_first_name VARCHAR(100) NOT NULL,
      id_last_name VARCHAR(100) NOT NULL,
      id_birth_date DATE NOT NULL,
      id_nationality VARCHAR(100) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_saved_id (user_id, id_number, id_type)
    )`,
    `CREATE TABLE IF NOT EXISTS saved_cards (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      card_name VARCHAR(100) NOT NULL,
      last_four VARCHAR(4) NOT NULL,
      card_number VARCHAR(19) NOT NULL DEFAULT '',
      expiry VARCHAR(5) NOT NULL,
      card_type VARCHAR(20) NOT NULL DEFAULT 'Card',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS password_history (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS verification_codes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) NOT NULL,
      code VARCHAR(6) NOT NULL,
      user_id INT NOT NULL,
      expires_at BIGINT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
  ];

  let i = 0;
  const runNext = () => {
    if (i >= tables.length) {
      // Add card_number column to existing tables that don't have it
      connection.query(
        `ALTER TABLE saved_cards ADD COLUMN card_number VARCHAR(19) NOT NULL DEFAULT ''`,
        (alterErr) => {
          if (alterErr && alterErr.errno !== 1060)
            console.error('ALTER saved_cards:', alterErr.message);

          connection.query(
            `ALTER TABLE vehicles ADD COLUMN transmission ENUM('automatic','manual') NOT NULL DEFAULT 'automatic'`,
            (tErr) => {
              if (tErr && tErr.errno !== 1060)
                console.error('ALTER vehicles transmission:', tErr.message);

              // Mark cheap vans and cheap economy cars as manual
              const manualIds = [84, 86, 87, 16, 17, 93, 94, 97, 98];
              connection.query(
                `UPDATE vehicles SET transmission = 'manual' WHERE id IN (?)`,
                [manualIds],
                (uErr) => {
                  if (uErr) console.error('SET manual transmission:', uErr.message);
                  connection.release();
                }
              );
            }
          );
        }
      );
      return;
    }
    connection.query(tables[i++], (createErr) => {
      if (createErr) console.error('Table creation error:', createErr.message);
      runNext();
    });
  };
  runNext();
});

module.exports = db;
