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
    const { name, email, image, role, profile } = req.body;

    const query = `
      INSERT INTO users (name, email, image, role, profile, created_at, last_loggedin)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (email) 
      DO UPDATE SET 
        last_loggedin = EXCLUDED.last_loggedin,
        image = EXCLUDED.image
      RETURNING *;
    `;

    const values = [
      name,
      email,
      image,
      role || "student",
      profile ? JSON.stringify(profile) : JSON.stringify({}), // Ensure it's a string
      new Date().toISOString(), // Use ISO string
      new Date().toISOString(),
    ];

    const result = await pool.query(query, values);
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Database Error:", error.message);
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

    if (!email) return res.status(400).json({ message: "Email is required" });

    // ১. ইউজার আছে কি না এবং তার বর্তমান প্রোফাইল ডাটা নিয়ে আসা
    const userResult = await pool.query(
      "SELECT profile FROM users WHERE email = $1",
      [email],
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const oldProfile = userResult.rows[0].profile || {};

    // ২. প্রোফাইল ডাটা মার্জ করা (যাতে রেটিং বা ভেরিফাইড স্ট্যাটাস হারিয়ে না যায়)
    const updatedProfile = {
      ...profile,
      education: Array.isArray(profile.education) ? profile.education : [],
      subjects: Array.isArray(profile.subjects) ? profile.subjects : [],
      experience: Array.isArray(profile.experience) ? profile.experience : [],
      verified: oldProfile.verified || false,
      rating: oldProfile.rating || 0,
      totalReviews: oldProfile.totalReviews || 0,
    };

    // ৩. ডাটাবেসে আপডেট করা
    // আপনার 'profile' কলামটি যদি JSONB হয় তবে সরাসরি অবজেক্ট দিন, নাহলে stringify করুন
    const updateQuery = `
      UPDATE users 
      SET profile = $1, updated_at = NOW() 
      WHERE email = $2 
      RETURNING profile;
    `;

    const result = await pool.query(updateQuery, [
      JSON.stringify(updatedProfile), // stringify করা নিরাপদ যদি JSONB ব্যবহার করেন
      email,
    ]);

    res.status(200).json({
      message: "Profile updated successfully",
      profile: result.rows[0].profile,
    });
  } catch (error) {
    console.error("Database Error:", error); // এটি আপনার কনসোলে এরর ডিটেইলস দেখাবে
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

// GET endpoint - Fetch tutor profile by email (Neon/PostgreSQL version)
app.get("/users/profile/:email", async (req, res) => {
  try {
    const { email } = req.params;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // PostgreSQL SELECT query
    const query = "SELECT * FROM users WHERE email = $1";
    const result = await pool.query(query, [email]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = result.rows[0];

    res.status(200).json({
      profile: user.profile || {
        title: "",
        bio: "",
        location: "",
        phone: "",
        education: [],
        subjects: [],
        experience: [],
      },
      name: user.name,
      email: user.email,
      image: user.image,
      role: user.role,
    });
  } catch (error) {
    console.error("Error fetching profile from Neon:", error);
    res.status(500).json({ message: error.message });
  }
});
app.get("/", (req, res) => {
  res.send("EduNextGen API is running with PostgreSQL!");
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

module.exports = app;
