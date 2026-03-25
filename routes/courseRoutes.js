const express = require("express");
const router = express.Router();
const courseCtrl = require("../controllers/courseController");

// Course routes
router.get("/courses", courseCtrl.getAllCourses);

// Camp routes
router.get("/camps", courseCtrl.getAllCamps);

module.exports = router;
