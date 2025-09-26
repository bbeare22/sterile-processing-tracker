const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const router = express.Router();

function signToken(user) {
  return jwt.sign(
    { userId: user._id.toString(), role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { email, password, name, employeeId, sterilizationNumber } = req.body;

    const exists = await User.findOne({ email }).lean();
    if (exists) return res.status(400).json({ error: "Email already in use" });

    const user = await User.create({
      email,
      password,
      name,
      employeeId,
      sterilizationNumber,
      // role defaults to "tech" from the model; or allow passing a role if you want
    });

    const token = signToken(user);
    return res.status(201).json({ token, user: user.toPublicJSON() });
  } catch (e) {
    return res.status(500).json({ error: "Registration failed" });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // password has select:false in the model
    const user = await User.findOne({ email }).select("+password");
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const ok = await user.comparePassword(password);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const token = signToken(user);
    return res.json({ token, user: user.toPublicJSON() });
  } catch (e) {
    return res.status(500).json({ error: "Login failed" });
  }
});

module.exports = router;
