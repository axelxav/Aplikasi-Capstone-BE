const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const { v4: uuidv4 } = require("uuid"); // Import uuid for generating unique identifiers
// const bcrypt = require('bcrypt'); // Uncomment if you want to use password hashing

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// PostgreSQL Connection
const pool = new Pool({
  user: "postgres", // replace with your database user
  host: "localhost", // replace with your host if necessary
  database: "capstone", // your database name
  // password: '1234', // postgres database for windows
  password: "1234", // postgres database for ubuntu
  port: 5432, // default PostgreSQL port
});

// POST Route for User Registration
app.post("/register", async (req, res) => {
  const { username, password, userEmail, phoneNumber, licensePlate } = req.body;

  if (!username || !password || !userEmail || !phoneNumber || !licensePlate) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const userUnique = uuidv4(); // Generate a unique identifier for the user

  try {
    // Hash the password before storing (if bcrypt is implemented)
    // const hashedPassword = await bcrypt.hash(password, 10);
    const query = `
      INSERT INTO user_credentials (username, password, user_email, phone_num, license_plate, user_unique)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`;
    const values = [
      username,
      password /* hashedPassword,*/,
      userEmail,
      phoneNumber,
      licensePlate,
      userUnique,
    ]; // Include userUnique in values
    const result = await pool.query(query, values);

    return res.status(201).json({
      message: "User registered successfully!",
      userId: result.rows[0].id,
      userUnique,
    });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Database query failed", error: err.message });
  }
});

// POST Route for User Sign In
app.post("/signin", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res
      .status(400)
      .json({ message: "Username and password are required" });
  }

  try {
    const query =
      "SELECT * FROM user_credentials WHERE username = $1 AND password = $2";
    const values = [username, password];
    const result = await pool.query(query, values);

    if (result.rows.length > 0) {
      const user = result.rows[0];

      return res.status(200).json({
        message: "Sign in successful!",
        id: user.id,
        username: user.username,
        password: user.password,
        user_email: user.user_email,
        phone_num: user.phone_num,
        license_plate: user.license_plate,
        user_unique: user.user_unique, // Return user_unique
      });
    } else {
      return res.status(401).json({ message: "Invalid username or password" });
    }
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Database query failed", error: err.message });
  }
});

app.get("/getPlaces", async (req, res) => {
  const { places_type, places_addr } = req.query; // Get places_type and places_addr from query params

  let query = "SELECT * FROM places";
  const values = [];
  const conditions = [];

  // Build query based on parameters provided
  if (places_type) {
    conditions.push("places_type = $1");
    values.push(places_type);
  }

  if (places_addr) {
    conditions.push("places_addr = $2");
    values.push(places_addr);
  }

  if (conditions.length > 0) {
    query += " WHERE " + conditions.join(" AND ");
  }

  console.log("Query:", query); // Log the constructed SQL query
  console.log("Values:", values); // Log parameter values

  try {
    const result = await pool.query(query, values); // Execute the query
    res.status(200).json(result.rows); // Respond with the rows
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ error: "Error fetching places" });
  }
});

app.post("/reservation", async (req, res) => {
  const { user_id, selectedSlot } = req.body;

  if (!user_id) {
    return res.status(400).json({ message: "empty values (user_id)" });
  }
  if (!selectedSlot) {
    return res.status(400).json({ message: "empty values (selectedSlot)" });
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
          message: "Reservation successful!",
          reservation_qr: reservation_qr, // Return the fetched reservation_qr
        });
      } else {
        return res.status(404).json({ message: "Reservation not found" });
      }
    } else {
      return res.status(404).json({ message: "Failed to create reservation" });
    }
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Database query failed", error: err.message });
  }
});

app.get("/hasArrived", async (req, res) => {
  const { user_id } = req.query;

  const query = `SELECT has_arrived FROM sensor_data WHERE user_id = $1`;
  const values = [user_id];
  const result = await pool.query(query, values);

  if (result.rows.length > 0) {
    const has_arrived = result.rows[0].has_arrived;

    return res.status(200).json({
      has_arrived: has_arrived,
    });
  } else {
    return res
      .status(404)
      .json({ message: "error on update has_arrived status!" });
  }
});

app.post("/has_open", async (req, res) => {
  const { user_id } = req.body;

  const query = `UPDATE sensor_data SET has_open = true WHERE user_id = $1`;
  const values = [user_id];
  const result = await pool.query(query, values);

  if (result.rowCount > 0) {
    return res.status(200).json({
      message: "The gate is open!",
    });
  } else {
    return res
      .status(404)
      .json({ message: "error on update has_open status!" });
  }
});

app.get("/hasFinished", async (req, res) => {
  const { user_id } = req.query;

  const query = `SELECT has_finished FROM sensor_data WHERE user_id = $1`;
  const values = [user_id];
  const result = await pool.query(query, values);

  if (result.rows.length > 0) {
    const has_finished = result.rows[0].has_finished;

    return res.status(200).json({
      has_finished: has_finished,
    });
  } else {
    return res
      .status(404)
      .json({ message: "error on update has_finished status!" });
  }
});

app.post("/finishReservation", async (req, res) => {
  const { user_id } = req.body;
  const queries = [
    `UPDATE sensor_data SET has_finished = false WHERE user_id = $1`,
    `UPDATE sensor_data SET has_open = false WHERE user_id = $1`,
    `UPDATE sensor_data SET has_arrived = false WHERE user_id = $1`,
    `UPDATE sensor_data SET user_id = null WHERE user_id = $1`,
  ];
  const values = [user_id];

  try {
    await pool.query("BEGIN"); // Begin a new transaction

    for (const query of queries) {
      const result = await pool.query(query, values);
      if (result.rowCount === 0) {
        // If the current update did not affect any rows, roll back and return an error
        await pool.query("ROLLBACK");
        return res
          .status(404)
          .json({ message: "No rows updated for given user_id." });
      }
    }

    await pool.query("COMMIT"); // Commit the transaction if all updates were successful

    return res
      .status(200)
      .json({ message: "Reservation status updated successfully!" });
  } catch (error) {
    await pool.query("ROLLBACK"); // Roll back all updates in case of error
    console.error("Error updating reservation status:", error);
    return res
      .status(500)
      .json({ message: "Internal server error while finishing reservation." });
  }
});

app.get("/scanSensorData", async (req, res) => {
  const { user_id } = req.query;

  // Ensure user_id is provided
  if (!user_id) {
    return res.status(400).json({ message: "User ID is required" });
  }

  const query = `SELECT * FROM sensor_data WHERE user_id = $1`;
  const values = [user_id];

  try {
    const result = await pool.query(query, values);

    if (result.rows.length > 0) {
      const sensor_data = result.rows[0];

      return res.status(200).json({
        fetched_user_id: sensor_data.user_id,
        slotAssigned: sensor_data.id,
        slotAssignedQr: sensor_data.reservation_qr,
      });
    } else {
      return res
        .status(404)
        .json({ message: "No sensor data found for user ID: " + values });
    }
  } catch (error) {
    console.error("Error fetching sensor data:", error);
    return res
      .status(500)
      .json({ message: "An error occurred while scanning sensor data" });
  }
});

app.post("/editProfile", async (req, res) => {
  const {
    user_id,
    newUsername,
    newPassword,
    newEmail,
    newPhoneNum,
    newLicensePlate,
  } = req.body;

  try {
    let query = `UPDATE user_credentials SET`;
    const values = [];
    const conditions = [];

    // Dynamically build the query based on provided fields
    if (newUsername) {
      conditions.push(`username = $${conditions.length + 1}`);
      values.push(newUsername);
    }
    if (newPassword) {
      conditions.push(`password = $${conditions.length + 1}`);
      values.push(newPassword);
    }
    if (newEmail) {
      conditions.push(`user_email = $${conditions.length + 1}`);
      values.push(newEmail);
    }
    if (newPhoneNum) {
      conditions.push(`phone_num = $${conditions.length + 1}`);
      values.push(newPhoneNum);
    }
    if (newLicensePlate) {
      conditions.push(`license_plate = $${conditions.length + 1}`);
      values.push(newLicensePlate);
    }

    // Ensure there are fields to update
    if (conditions.length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }

    // Add user_id to the end of values and build the WHERE clause
    values.push(user_id);
    query += " " + conditions.join(", ") + ` WHERE id = $${values.length}`;

    console.log("Query:", query); // Log the constructed SQL query
    console.log("Values:", values); // Log parameter values

    // Execute the query
    const result = await pool.query(query, values);
    res.status(200).json({ message: "Profile updated successfully!" });
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ error: "Error updating profile" });
  }
});

app.post("/updateHistory", async (req, res) => {
  const { user_id, placeId } = req.body;

  try {
    const query = `INSERT INTO history_data (user_id, places_id) VALUES ($1, $2)`;
    const values = [user_id, placeId];
    const result = await pool.query(query, values);

    return res.status(201).json({
      message: "History updated successfully!",
      history_id: result.rows[0].id,
      user_id,
      placeId,
    });
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ error: "Error updating history" });
  }
});

// getting history data for activity page
app.get("/getHistory", async (req, res) => {
  const { user_id } = req.query;

  const query = `SELECT hd.*, p.* FROM history_data hd JOIN places p ON hd.places_id = p.id WHERE hd.user_id = $1`;
  const values = [user_id];

  try {
    const result = await pool.query(query, values);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ error: "Error fetching history" });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
