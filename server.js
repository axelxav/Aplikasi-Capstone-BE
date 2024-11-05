const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid'); // Import uuid for generating unique identifiers
// const bcrypt = require('bcrypt'); // Uncomment if you want to use password hashing

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
  const { username, password, userEmail, phoneNumber, licensePlate } = req.body;

  if (!username || !password || !userEmail || !phoneNumber || !licensePlate) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  const userUnique = uuidv4(); // Generate a unique identifier for the user

  try {
    // Hash the password before storing (if bcrypt is implemented)
    // const hashedPassword = await bcrypt.hash(password, 10);
    const query = `
      INSERT INTO user_credentials (username, password, user_email, phone_num, license_plate, user_unique)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`;
    const values = [username, password /* hashedPassword,*/, userEmail, phoneNumber, licensePlate, userUnique]; // Include userUnique in values
    const result = await pool.query(query, values);
    
    return res.status(201).json({ 
      message: 'User registered successfully!', 
      userId: result.rows[0].id, 
      userUnique 
    });
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
      const user = result.rows[0];

      return res.status(200).json({
        message: 'Sign in successful!',
        id: user.id,
        username: user.username,
        user_email: user.user_email,
        phone_num: user.phone_num,
        license_plate: user.license_plate,
        user_unique: user.user_unique, // Return user_unique
      });
    } else {
      return res.status(401).json({ message: 'Invalid username or password' });
    }
  } catch (err) {
    return res.status(500).json({ message: 'Database query failed', error: err.message });
  }
});

app.get('/getPlaces', async (req, res) => {
  const { places_type, places_addr } = req.query; // Get places_type and places_addr from query params
  
  let query = 'SELECT * FROM places';
  const values = [];
  const conditions = [];

  // Build query based on parameters provided
  if (places_type) {
    conditions.push('places_type = $1');
    values.push(places_type);
  }
  
  if (places_addr) {
    conditions.push('places_addr = $2');
    values.push(places_addr);
  }
  
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  console.log('Query:', query); // Log the constructed SQL query
  console.log('Values:', values); // Log parameter values

  try {
      const result = await pool.query(query, values); // Execute the query
      res.status(200).json(result.rows); // Respond with the rows
  } catch (error) {
      console.error('Database error:', error);
      res.status(500).json({ error: 'Error fetching places' });
  }
});

app.post('/reservation', async (req, res) => {
  const { user_id, selectedSlot } = req.body;

  if (!user_id) {
    return res.status(400).json({ message: 'empty values (user_id)' });
  }
  if (!selectedSlot) {
    return res.status(400).json({ message: 'empty values (selectedSlot)' });
  }

  try {
    // First update the sensor_data entry
    const updateQuery = `UPDATE sensor_data SET user_id = $1 WHERE id = $2`;
    const updateValues = [user_id, selectedSlot];
    const updateResult = await pool.query(updateQuery, updateValues);

    if (updateResult.rowCount > 0) {
      // Now fetch the updated entry to get the reservation_qr
      const fetchQuery = `SELECT reservation_qr FROM sensor_data WHERE id = $1`;
      const fetchValues = [selectedSlot];
      const fetchResult = await pool.query(fetchQuery, fetchValues);

      if (fetchResult.rows.length > 0) {
        const reservation_qr = fetchResult.rows[0].reservation_qr;

        return res.status(200).json({
          message: 'Reservation successful!',
          reservation_qr: reservation_qr, // Return the fetched reservation_qr
        });
      } else {
        return res.status(404).json({ message: 'Reservation not found' });
      }
    } else {
      return res.status(404).json({ message: 'Failed to create reservation' });
    }
  } catch (err) {
    return res.status(500).json({ message: 'Database query failed', error: err.message });
  }
});


app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
