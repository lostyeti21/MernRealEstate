import express from "express";
import {
  updateUser,
  deleteUser,
  getUserListings,
  getUser,
  rateLandlord,
  checkIfRated,
  getLandlords,
  getTenants,
} from "../controllers/user.controller.js";
import { verifyToken } from "../utils/verifyUser.js";

const router = express.Router();

// Landlord-specific routes
router.get("/landlords", getLandlords); // Get all landlords
router.get("/tenants", getTenants); // Add this route
router.post("/rate", verifyToken, rateLandlord); // Rate a landlord
router.get("/check-rated/:landlordId", verifyToken, checkIfRated); // Check if user has rated a landlord

// User update and deletion routes
router.post("/update/:id", verifyToken, updateUser);
router.delete("/delete/:id", verifyToken, deleteUser);

// User-specific data routes
router.get("/listings/:id", verifyToken, getUserListings);
router.get("/:id", verifyToken, getUser);




export default router;
