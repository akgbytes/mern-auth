const express = require("express");
const router = express.Router();
const { register, verifyRegister } = require("../controllers/userController");

router.post("/register", register);
router.post("/verify-register", verifyRegister);
module.exports = router;
