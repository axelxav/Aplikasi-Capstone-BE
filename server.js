// server.js
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// PostgreSQL Connection
const pool = new Pool({
  user: 'postgres', // replace with your database user
  host: 'localhost', // replace with your host if necessary
  database: 'capstone', // your database name
  password: '1234', // replace with your database password
  port: 5432, // default PostgreSQL port
});

// POST Route for User Registration
app.post('/register', async (req, res) => {
  const { username, password, phoneNumber, licensePlate } = req.body;

  if (!username || !password || !phoneNumber || !licensePlate) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const query = 'INSERT INTO user_credentials (username, password, phone_num, license_plate) VALUES ($1, $2, $3, $4) RETURNING id';
    const values = [username, password, phoneNumber, licensePlate];
    const result = await pool.query(query, values);
    
    return res.status(201).json({ message: 'User registered successfully!', userId: result.rows[0].id });
  } catch (err) {
    return res.status(500).json({ message: 'Database query failed', error: err.message });
  }
});

// POST Route for User Sign In
app.post('/signin', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  try {
    const query = 'SELECT * FROM user_credentials WHERE username = $1 AND password = $2';
    const values = [username, password];
    const result = await pool.query(query, values);

    if (result.rows.length > 0) {
      return res.status(200).json({ message: 'Sign in successful!', userId: result.rows[0].id });
    } else {
      return res.status(401).json({ message: 'Invalid username or password' });
    }
  } catch (err) {
    return res.status(500).json({ message: 'Database query failed', error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
