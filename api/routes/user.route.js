import express from "express";
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
import { verifyToken } from "../utils/verifyUser.js"; // Adjust path if necessary

const router = express.Router();

// Public endpoints
router.get("/landlords", getLandlords); // Get all landlords
router.get("/tenants", getTenants); // Get all tenants
router.get("/listings/:id", getUserListings); // Get a user's listings
router.get("/:id", getUser); // Get a single user

// Protected endpoints (require authentication)
router.post("/rate-landlord", verifyToken, rateLandlord); // Rate a landlord
router.post("/rate-tenant", verifyToken, rateTenant); // Rate a tenant
router.get("/check-rated/:landlordId", verifyToken, checkIfRated); // Check if user rated a landlord

// Profile management (protected)
router.post("/update/:id", verifyToken, updateUser); // Update user profile
router.delete("/delete/:id", verifyToken, deleteUser); // Delete user account

export default router;
