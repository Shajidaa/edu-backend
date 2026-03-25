const pool = require("../config/db");

// Get all courses
exports.getAllCourses = async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM courses");
    res.json(result.rows);
  } catch (error) {
    console.error("Course Fetch Error:", error.message);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Get all camps
exports.getAllCamps = async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM camps");
    res.json(result.rows);
  } catch (error) {
    console.error("Camp Fetch Error:", error.message);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
