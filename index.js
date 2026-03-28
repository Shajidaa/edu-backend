require("dotenv").config();
const express = require("express");
const cors = require("cors");
const pool = require("./config/db");

const userRoutes = require("./routes/userRoutes");
const bookingController = require("./controllers/bookingController");
const courseRoutes = require("./routes/courseRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(cors());

// --- Routes ---
app.use("/users", userRoutes);
app.use("/api/bookings", bookingRoutes);

app.post("/api/bookings/manual", bookingController.createBooking);
app.get("/api/bookings/student/:email", bookingController.getStudentBookings);

app.get("/competitions", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM competitions");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: "Internal error" });
  }
});
app.post("/competitions/register", async (req, res) => {
  try {
    // 1. Destructure ALL fields sent from the frontend
    const { competitionId, email, phoneNumber, grade, schoolName } = req.body;

    // 2. Check if already registered using email AND competitionId
    const checkQuery = `SELECT * FROM competition_registrations WHERE competition_id = $1 AND student_email = $2`;
    const checkResult = await pool.query(checkQuery, [competitionId, email]);

    if (checkResult.rows.length > 0) {
      return res.status(400).json({ message: "Already registered!" });
    }

    // 3. Insert all details into the DB
    const insertQuery = `
      INSERT INTO competition_registrations 
      (competition_id, student_email, phone_number, grade, school_name) 
      VALUES ($1, $2, $3, $4, $5) RETURNING *;
    `;
    const result = await pool.query(insertQuery, [
      competitionId || 1, // Fallback ID if not provided
      email,
      phoneNumber,
      grade,
      schoolName,
    ]);

    res
      .status(201)
      .json({
        message: "Registration successful!",
        registration: result.rows[0],
      });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Registration failed" });
  }
});

// Courses & Camps (Simple GETs)
app.get("/courses", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM courses");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: "Internal error" });
  }
});

app.get("/camps", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM camps");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: "Internal error" });
  }
});

app.get("/", (req, res) => {
  res.send("EduNextGen API is running with PostgreSQL!");
});

app.listen(port, () => {
  console.log(`🚀 Server listening on port ${port}`);
});
