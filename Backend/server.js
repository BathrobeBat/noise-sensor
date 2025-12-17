const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = 8080;

// Middleware
app.use(cors());
app.use(express.json());

// PostgreSQL connection
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'noisesensor',
  password: process.env.DB_PASSWORD,
  port: 5432,
});

// Test database connection
pool.connect((err) => {
  if (err) {
    console.error('Database connection failed:', err);
  } else {
    console.log('Connected to PostgreSQL database!');
  }
});

// Create table if it doesn't exist
const createTableQuery = `
  CREATE TABLE IF NOT EXISTS noise_readings (
    id SERIAL PRIMARY KEY,
    dba_instant DECIMAL(5,2) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`;

pool.query(createTableQuery, (err) => {
  if (err) {
    console.error('Error creating table:', err);
  } else {
    console.log('Table "noise_readings" is ready');
  }
});

// =================== API ENDPOINTS ===================

// POST endpoint for ESP32 to send data
app.post('/api/noise-data', async (req, res) => {
  const { dba_instant } = req.body;

  if (!dba_instant) {
    return res.status(400).json({ error: 'dba_instant is required' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO noise_readings (dba_instant) VALUES ($1) RETURNING *',
      [dba_instant]
    );
    console.log(`Stored: ${dba_instant} dBA`);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error inserting data:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET endpoint for frontend to fetch latest reading
app.get('/api/live', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM noise_readings ORDER BY timestamp DESC LIMIT 1'
    );
    if (result.rows.length === 0) {
      return res.json({ dba_instant: 0 });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET endpoint for frontend to fetch historical data (last 60 readings)
app.get('/api/hourly', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM noise_readings ORDER BY timestamp DESC LIMIT 60'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
  console.log('Available endpoints:');
  console.log('  POST /api/noise-data  - ESP32 sends data here');
  console.log('  GET  /api/live        - Frontend gets latest reading');
  console.log('  GET  /api/hourly      - Frontend gets last 60 readings');
});