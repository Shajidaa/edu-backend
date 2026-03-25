const pool = require("../config/db");

exports.createBooking = async (req, res) => {
  try {
    const { tutorEmail, studentEmail, studentName, meetingUrl } = req.body;
    const query = `
      INSERT INTO bookings (student_name, student_email, tutor_email, start_time, meeting_url)
      VALUES ($1, $2, $3, NOW(), $4) RETURNING *;
    `;
    const values = [
      studentName,
      studentEmail,
      tutorEmail,
      meetingUrl || "Check Calendly for Link",
    ];
    const result = await pool.query(query, values);
    res
      .status(200)
      .json({ message: "Booking saved!", booking: result.rows[0] });
  } catch (error) {
    res.status(500).json({ message: "Failed to save booking" });
  }
};

exports.getStudentBookings = async (req, res) => {
  try {
    const { email } = req.params;
    const query = `SELECT * FROM bookings WHERE student_email = $1 ORDER BY start_time DESC;`;
    const result = await pool.query(query, [email]);
    res.status(200).json(result.rows);
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
};
