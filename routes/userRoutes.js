const express = require("express");
const router = express.Router();
const userCtrl = require("../controllers/userController");

router.post("/", userCtrl.upsertUser);
router.get("/email/:email", userCtrl.getUserByEmail);
router.put("/profile", userCtrl.updateProfile);
router.get("/tutors", userCtrl.getAllTutors);
router.get("/profile/:email", userCtrl.getProfileDetails);

module.exports = router;
