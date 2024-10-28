const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// CORS configuration
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use(express.json());

// Database connection
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Error connecting to the database', err);
  } else {
    console.log('Successfully connected to the database');
  }
});

// Test database connection
app.get('/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ success: true, time: result.rows[0].now });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Database connection failed' });
  }
});

// GET /api/tags - Retrieve all tags
app.get('/api/tags', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tags');
    res.json(result.rows);
  } catch (err) {
    console.error('Error in GET /api/tags:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// POST /api/tags - Add new tags
app.post('/api/tags', async (req, res) => {
  try {
    const { tags } = req.body;
    for (let tag of tags) {
      await pool.query(
        'INSERT INTO tags (tag, count) VALUES ($1, 1) ON CONFLICT (tag) DO UPDATE SET count = tags.count + 1',
        [tag]
      );
    }
    res.status(201).json({ message: 'Tags added successfully' });
  } catch (err) {
    console.error('Error in POST /api/tags:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// DELETE /api/tags/:id - Delete a tag by id
app.delete('/api/tags/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM tags WHERE id = $1', [id]);
    res.status(200).json({ message: 'Tag deleted successfully' });
  } catch (err) {
    console.error('Error in DELETE /api/tags/:id:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// GET /api/tagcloud - Retrieve random tags for cloud
app.get('/api/tagcloud', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tags ORDER BY RANDOM() LIMIT 20');
    res.json(result.rows);
  } catch (err) {
    console.error('Error in /api/tagcloud:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../frontend/build')));

// The "catchall" handler: for any request that doesn't match one above, send back React's index.html file.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
