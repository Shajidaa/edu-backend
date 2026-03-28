const pool = require("../config/db");

// Get all competitions with counts for the tabs
exports.getAllCompetitions = async (req, res) => {
  try {
    // 1. Fetch all competitions
    const query = `SELECT * FROM competitions ORDER BY created_at DESC;`;
    const result = await pool.query(query);

    // 2. Fetch counts for UI badges (Practice vs Completed)
    const countQuery = `
      SELECT 
        COUNT(*) FILTER (WHERE status = 'practice') as practice_count,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_count
      FROM competitions;
    `;
    const counts = await pool.query(countQuery);

    res.status(200).json({
      competitions: result.rows,
      meta: counts.rows[0],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch competitions" });
  }
};

// Register a student for a competition
exports.registerCompetition = async (req, res) => {
  try {
    const { competitionId, studentEmail } = req.body;

    // Check if already registered to prevent duplicates
    const checkQuery = `SELECT * FROM competition_registrations WHERE competition_id = $1 AND student_email = $2`;
    const checkResult = await pool.query(checkQuery, [
      competitionId,
      studentEmail,
    ]);

    if (checkResult.rows.length > 0) {
      return res
        .status(400)
        .json({ message: "You are already registered for this!" });
    }

    const insertQuery = `
      INSERT INTO competition_registrations (competition_id, student_email)
      VALUES ($1, $2) RETURNING *;
    `;
    const result = await pool.query(insertQuery, [competitionId, studentEmail]);

    res.status(201).json({
      message: "Registration successful!",
      registration: result.rows[0],
    });
  } catch (error) {
    res.status(500).json({ message: "Registration failed" });
  }
};
