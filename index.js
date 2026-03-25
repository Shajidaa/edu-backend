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
// app.use("/api/courses", courseRoutes);

app.post("/api/bookings/manual", bookingController.createBooking);
app.get("/api/bookings/student/:email", bookingController.getStudentBookings);

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
