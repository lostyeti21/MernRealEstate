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

const router = express.Router();

// Public endpoints
router.get("/landlords", getLandlords);
router.get("/tenants", getTenants);
router.get("/:id", getUser);
router.get("/listings/:id", getUserListings);

// Protected endpoints
router.post("/rate-landlord", rateLandlord);
router.post("/rate-tenant", rateTenant);
router.get("/check-rated/:landlordId", checkIfRated);

// Profile management (protected)
router.post("/update/:id", updateUser);
router.delete("/delete/:id", deleteUser);

export default router;
