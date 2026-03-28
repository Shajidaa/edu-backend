const express = require("express");
const router = express.Router();
const competitionController = require("../controllers/competitionController");

router.get("/", competitionController.getAllCompetitions);
router.post("/register", competitionController.registerCompetition);

module.exports = router;
