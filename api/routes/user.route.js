import express from "express";
import mongoose from "mongoose";
import {
  getUser,
  getUserListings,
  getLandlords,
  getTenants,
  rateLandlord,
  rateTenant,
  checkIfRated,
  updateUser,
  deleteUser,
} from "../controllers/user.controller.js";
import { verifyToken } from "../utils/verifyUser.js";
import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import Listing from "../models/listing.model.js";

const router = express.Router();

// Public endpoints
router.get("/landlords", getLandlords);
router.get("/tenants", getTenants);
router.get("/listings/:id", verifyToken, async (req, res) => {
  try {
    const userId = req.params.id;
    
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID"
      });
    }

    const listings = await Listing.find({ userRef: userId });
    console.log('Found listings for user:', userId, listings);

    return res.status(200).json({
      success: true,
      listings: listings || []
    });
  } catch (error) {
    console.error('Error fetching listings:', error);
    return res.status(500).json({
      success: false,
      message: "Error fetching listings"
    });
  }
});
router.get("/:id", getUser); // Get a single user

// Protected endpoints
router.post("/rate-landlord", verifyToken, rateLandlord);
router.post("/rate-tenant", verifyToken, rateTenant);
router.get("/check-rated/:landlordId", verifyToken, checkIfRated);

// Profile management (protected)
router.post("/update/:id", verifyToken, updateUser);
router.delete("/delete/:id", verifyToken, deleteUser);

// Change Password (protected)
router.post("/change-password/:id", verifyToken, async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const userId = req.params.id;

  if (!oldPassword || !newPassword) {
    return res.status(400).json({ success: false, message: "All fields are required." });
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    // Validate old password
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Incorrect old password." });
    }

    // Hash and update the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({ success: true, message: "Password changed successfully." });
  } catch (error) {
    console.error("Error changing password:", error.message);
    res.status(500).json({ success: false, message: "An unexpected error occurred." });
  }
});

// NEW ROUTE: Get landlord data and listings
router.get("/landlord/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('Fetching landlord data for:', userId);

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID"
      });
    }

    // Find the landlord
    const landlord = await User.findById(userId, 
      "username email avatar phoneNumbers ratings ratedBy"
    );

    if (!landlord) {
      return res.status(404).json({
        success: false,
        message: "Landlord not found"
      });
    }

    // Find landlord's listings
    const listings = await Listing.find({ userRef: userId.toString() });

    // Calculate average rating
    const averageRating = landlord.ratings.length > 0
      ? landlord.ratings.reduce((sum, rating) => sum + rating, 0) / landlord.ratings.length
      : 0;

    return res.status(200).json({
      success: true,
      landlord: {
        _id: landlord._id,
        username: landlord.username,
        email: landlord.email,
        avatar: landlord.avatar,
        phoneNumbers: landlord.phoneNumbers,
        averageRating,
        totalRatings: landlord.ratedBy.length
      },
      listings
    });
  } catch (error) {
    console.error("Error fetching landlord:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching landlord data"
    });
  }
});
// Route to reset password via email
router.post("/reset-password", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: "Email and password are required." });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    // Hash and update the new password
    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({ success: true, message: "Password reset successful." });
  } catch (error) {
    console.error("Error resetting password:", error.message);
    res.status(500).json({ success: false, message: "An unexpected error occurred." });
  }
});


export default router;