import express from "express";
import mongoose from "mongoose"; // Import mongoose
import { verifyToken } from "../utils/verifyUser.js";
import {
  createListing,
  deleteListing,
  updateListing,
  getListing,
  getListings,
} from "../controllers/listing.controller.js";
import Listing from "../models/listing.model.js"; // Ensure correct path to your Listing model

const router = express.Router();

// Routes for managing listings
router.post("/create", verifyToken, createListing); // Create a new listing
router.delete("/delete/:id", verifyToken, deleteListing); // Delete a specific listing
router.post("/update/:id", verifyToken, updateListing); // Update a specific listing

// Routes for fetching listings
router.get("/get/:id", getListing); // Get a single listing by ID
router.get("/get", getListings); // Get all listings

// Route to fetch all listings by a specific landlord (using userRef = userId)
router.get("/landlord/:userId", async (req, res) => {
    const { userId } = req.params;
  
    console.log("Fetching listings for userId:", userId); // Debug log
  
    try {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        console.log("Invalid userId:", userId); // Debug log
        return res.status(400).json({ message: "Invalid user ID." });
      }
  
      const listings = await Listing.find({ userRef: userId });
  
      if (!listings.length) {
        console.log("No listings found for userId:", userId); // Debug log
        return res.status(404).json({ message: "No listings found for this user." });
      }
  
      console.log("Found listings for userId:", listings); // Debug log
      res.status(200).json(listings);
    } catch (error) {
      console.error("Error fetching landlord listings:", error.message); // Error log
      res.status(500).json({ message: "Internal server error." });
    }
  });
  

export default router;