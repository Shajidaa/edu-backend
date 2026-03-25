const pool = require("../config/db");

// 1. Create or Update User (UPSERT)
exports.upsertUser = async (req, res) => {
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
      profile ? JSON.stringify(profile) : JSON.stringify({}),
      new Date().toISOString(),
      new Date().toISOString(),
    ];
    const result = await pool.query(query, values);
    res.status(200).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 2. Get User by Email
exports.getUserByEmail = async (req, res) => {
  try {
    const { email } = req.params;
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    if (result.rows.length === 0)
      return res.status(404).json({ message: "User not found" });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 3. Update Tutor Profile
exports.updateProfile = async (req, res) => {
  try {
    const { email, profile } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const userResult = await pool.query(
      "SELECT profile FROM users WHERE email = $1",
      [email],
    );
    if (userResult.rows.length === 0)
      return res.status(404).json({ message: "User not found" });

    const oldProfile = userResult.rows[0].profile || {};
    const updatedProfile = {
      ...profile,
      education: Array.isArray(profile.education) ? profile.education : [],
      subjects: Array.isArray(profile.subjects) ? profile.subjects : [],
      experience: Array.isArray(profile.experience) ? profile.experience : [],
      verified: oldProfile.verified || false,
      rating: oldProfile.rating || 0,
      totalReviews: oldProfile.totalReviews || 0,
    };

    const updateQuery = `UPDATE users SET profile = $1, updated_at = NOW() WHERE email = $2 RETURNING profile;`;
    const result = await pool.query(updateQuery, [
      JSON.stringify(updatedProfile),
      email,
    ]);
    res.status(200).json({
      message: "Profile updated successfully",
      profile: result.rows[0].profile,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 4. Get All Tutors
exports.getAllTutors = async (req, res) => {
  try {
    const query = `SELECT name, email, image, profile FROM users WHERE role = 'tutor' ORDER BY (profile->>'rating')::float DESC;`;
    const result = await pool.query(query);
    res.status(200).json({ tutors: result.rows });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 5. Get Detailed Profile
exports.getProfileDetails = async (req, res) => {
  try {
    const { email } = req.params;
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    if (result.rows.length === 0)
      return res.status(404).json({ message: "User not found" });

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
    res.status(500).json({ message: error.message });
  }
};
