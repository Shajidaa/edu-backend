require("dotenv").config();
const express = require("express");
const app = express();
const port = 5000;
const cors = require("cors");
const { Pool } = require("pg");

// PostgreSQL Connection Pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Neon/Supabase এর জন্য প্রয়োজন
  },
});

app.use(express.json());
app.use(cors());

// --- Routes ---

// ১. ব্যবহারকারী তৈরি বা আপডেট (PostgreSQL UPSERT)
app.post("/users", async (req, res) => {
  try {
    const { name, email, image, role, profile, created_at, last_loggedIn } =
      req.body;

    const query = `
      INSERT INTO users (name, email, image, role, profile, created_at, last_loggedin)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (email) 
      DO UPDATE SET 
        last_loggedin = EXCLUDED.last_loggedin,
        profile = users.profile || EXCLUDED.profile -- আগের প্রোফাইলের সাথে নতুনটা মার্জ হবে
      RETURNING *;
    `;

    // profile অবজেক্টটিকে JSON স্ট্রিং এ রূপান্তর করে পাঠানো হচ্ছে
    const values = [
      name,
      email,
      image,
      role || "student",
      JSON.stringify(profile || {}),
      created_at || new Date().toString(),
      last_loggedIn || new Date().toString(),
    ];

    const result = await pool.query(query, values);
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
});

// ২. ইমেইল দিয়ে ইউজার খুঁজে বের করা
app.get("/users/email/:email", async (req, res) => {
  try {
    const { email } = req.params;
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ৩. টিউটর প্রোফাইল আপডেট করা
app.put("/users/profile", async (req, res) => {
  try {
    const { email, profile } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // আগের ইউজার ডাটা চেক করা (Verified/Rating ঠিক রাখার জন্য)
    const userResult = await pool.query(
      "SELECT profile FROM users WHERE email = $1",
      [email],
    );
    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const oldProfile = userResult.rows[0].profile;

    const updatedProfile = {
      ...profile,
      verified: oldProfile?.verified || false,
      rating: oldProfile?.rating || 0,
      totalReviews: oldProfile?.totalReviews || 0,
    };

    const updateQuery = `
      UPDATE users 
      SET profile = $1, updated_at = $2 
      WHERE email = $3 
      RETURNING *;
    `;

    const result = await pool.query(updateQuery, [
      JSON.stringify(updatedProfile),
      new Date().toISOString(),
      email,
    ]);

    if (result.rowCount > 0) {
      res.status(200).json({
        message: "Profile updated successfully",
        result: result.rows[0],
      });
    } else {
      res.status(400).json({ message: "Failed to update profile" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ৪. সব টিউটরদের লিস্ট (রেটিং অনুযায়ী সর্ট করা)
app.get("/users/tutors", async (req, res) => {
  try {
    // PostgreSQL এ JSONB এর ভেতর সর্ট করার নিয়ম
    const query = `
      SELECT name, email, image, profile 
      FROM users 
      WHERE role = 'tutor' 
      ORDER BY (profile->>'rating')::float DESC;
    `;
    const result = await pool.query(query);
    res.status(200).json({ tutors: result.rows });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ৫. সব কোর্স নিয়ে আসা
app.get("/courses", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM courses");
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// ৬. সব ক্যাম্প নিয়ে আসা
app.get("/camps", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM camps");
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

app.get("/", (req, res) => {
  res.send("EduNextGen API is running with PostgreSQL!");
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

module.exports = app;
