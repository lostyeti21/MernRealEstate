import express from "express";
import bcrypt from "bcryptjs";
import User from "../models/user.model.js";

const router = express.Router();

// Admin Sign-In Route
router.post("/signin", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    // Find the admin user
    const user = await User.findOne({ email });
    if (!user || !user.isAdmin) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    res.status(200).json({ message: "Sign-in successful", email: user.email });
  } catch (error) {
    console.error("Sign-in error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Admin Creation Route
router.post("/create", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    // Check if the user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists." });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new admin user
    const newUser = new User({
      username: email.split("@")[0],
      email,
      password: hashedPassword,
      isAdmin: true,
    });

    await newUser.save();
    res.status(201).json({ message: "Admin user created successfully", email: newUser.email });
  } catch (error) {
    console.error("Error creating admin user:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
