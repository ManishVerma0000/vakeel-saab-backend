const express = require("express");
const { loginUser, register, getProfile,allLawyers } = require("../controllers/user");
const router = express.Router();

router.post("/login", loginUser);
router.post("/register", register);
router.post("/getProfile", getProfile);
router.get('/lawyers',allLawyers)




module.exports = router;
