import express from "express";
import { signin, signup, google, signout, forgotPassword } from "../controllers/auth.controller.js";
import { sendConfirmationCode, sendNotificationEmail } from "../controllers/email.controller.js"; // Import the controller for sending confirmation codes and notification emails
import User from "../models/user.model.js"; // Import the User model for email checking
import { verifyToken } from '../utils/verifyUser.js';
import bcryptjs from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken'; // Import jwt
import { errorHandler } from '../utils/error.js';

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

// Route to send notification emails
router.post("/send-notification-email", sendNotificationEmail);

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

// Route to handle forgot password
router.post("/forgot-password", forgotPassword);

// Route to verify reset code
router.post("/verify-reset-code", async (req, res, next) => {
  const { email, code } = req.body;

  try {
    // Validate inputs
    if (!email || !code) {
      return next(errorHandler(400, 'Email and verification code are required'));
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return next(errorHandler(404, 'No account found with this email'));
    }

    // Hash the provided code
    const hashedCode = crypto
      .createHash('sha256')
      .update(code)
      .digest('hex');

    // Check if code matches and is not expired
    if (
      user.resetToken !== hashedCode || 
      !user.resetTokenExpiry || 
      user.resetTokenExpiry < Date.now()
    ) {
      return next(errorHandler(400, 'Invalid or expired verification code'));
    }

    res.status(200).json({ 
      success: true, 
      message: 'Verification code is valid',
      email: user.email
    });

  } catch (error) {
    console.error('Verify reset code error:', error);
    next(errorHandler(500, 'Error verifying reset code'));
  }
});

// Route to handle password reset
router.post("/reset-password", async (req, res, next) => {
  const { email, newPassword } = req.body;

  try {
    // Validate inputs
    if (!email || !newPassword) {
      return next(errorHandler(400, 'Email and new password are required'));
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return next(errorHandler(404, 'No account found with this email'));
    }

    // Validate reset token still exists and is not expired
    if (!user.resetToken || !user.resetTokenExpiry || user.resetTokenExpiry < Date.now()) {
      return next(errorHandler(400, 'Reset session has expired. Please request a new code.'));
    }

    // Set the new password - it will be hashed by the pre-save middleware
    user.password = newPassword;
    user.resetToken = null;
    user.resetTokenExpiry = null;

    // Save the user to trigger the password hashing middleware
    await user.save();

    // Log successful password reset
    console.log('Password reset successful for email:', email);

    res.status(200).json({ 
      success: true, 
      message: 'Password reset successful' 
    });

  } catch (error) {
    console.error('Reset password error:', error);
    next(errorHandler(500, 'Error resetting password'));
  }
});

// Authentication Routes
router.get("/check-auth", verifyToken, (req, res) => {
  // If the request reaches here, the user is authenticated
  res.status(200).json({ authenticated: true, user: req.user });
});

// SuperUser Authentication Routes
router.post("/superuser/login", async (req, res, next) => {
  const { username, password } = req.body;
  
  try {
    // Hardcoded SuperUser credentials check
    if (username === 'admin' && password === 'ishe') {
      // Generate a token for the SuperUser
      const token = jwt.sign(
        { id: '6767dcec826d237d0ac04849', isSuperUser: true },
        process.env.JWT_SECRET
      );
      
      res.status(200).json({
        success: true,
        token,
        message: 'SuperUser login successful'
      });
    } else {
      next(errorHandler(401, 'Invalid SuperUser credentials'));
    }
  } catch (error) {
    next(error);
  }
});

router.get("/superuser/verify", async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ authenticated: false });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.isSuperUser) {
      res.status(200).json({ authenticated: true });
    } else {
      res.status(401).json({ authenticated: false });
    }
  } catch (error) {
    res.status(401).json({ authenticated: false });
  }
});

export default router;