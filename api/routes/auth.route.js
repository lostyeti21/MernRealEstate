import express from "express";
import { signin, signup, google, signout } from "../controllers/auth.controller.js";
import { sendConfirmationCode } from "../controllers/email.controller.js"; // Import the controller for sending confirmation codes
import User from "../models/user.model.js"; // Import the User model for email checking
import { verifyToken } from '../utils/verifyUser.js';

const router = express.Router();

// Route to handle user signin
router.post("/signin", signin);

// Route to handle user signup
router.post("/signup", signup);

// Route to handle Google authentication
router.post("/google", google);

// Route to handle user signout
router.get("/signout", signout);

// Route to send confirmation codes
router.post("/send-confirmation-code", sendConfirmationCode);

// Route to check if an email is already registered
router.post("/check-email", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: "Email is required." });
  }

  try {
    const user = await User.findOne({ email }); // Query the User model
    res.json({ exists: !!user }); // Respond with whether the email exists
  } catch (err) {
    console.error("Error checking email:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// Authentication Routes
router.get("/check-auth", verifyToken, (req, res) => {
  // If the request reaches here, the user is authenticated
  res.status(200).json({ authenticated: true, user: req.user });
});

export default router;