const express = require("express");
const router = express.Router();
const bookingCtrl = require("../controllers/bookingController");

// Manual booking creation
router.post("/manual", bookingCtrl.createBooking);

// Get bookings by student email
router.get("/student/:email", bookingCtrl.getStudentBookings);

module.exports = router;
