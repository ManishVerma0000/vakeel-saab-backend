// routes/router.js

const express = require("express");
const { loginUser, register, getProfile } = require("../controllers/user"); // destructure
const router = express.Router();

router.post("/login", loginUser);
router.post("/register", register);
router.post("/getProfile", getProfile);

module.exports = router;
