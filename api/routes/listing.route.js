import express from "express";
import mongoose from "mongoose"; // Import mongoose
import { verifyToken } from "../utils/verifyUser.js";
import {
  createListing,
  deleteListing,
  updateListing,
  getListing,
  getListings,
  getAgentListings,
  getLandlordListings,
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

// Route to fetch all listings by a specific landlord
router.get("/landlord/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('Getting listings for user:', userId);

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.log('Invalid userId format:', userId);
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    // Find listings using the string ID
    const listings = await Listing.find({ 
      userRef: userId.toString() 
    }).sort({ createdAt: -1 });

    console.log(`Found ${listings.length} listings for user:`, userId);
    console.log('Listings:', listings);

    return res.status(200).json({
      success: true,
      listings: listings || []
    });
  } catch (error) {
    console.error('Error fetching listings:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching listings'
    });
  }
});

router.get('/agent-listings/:id', verifyToken, getAgentListings);

// Debug route to check user's listings
router.get("/debug/user-listings/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const userObjectId = new mongoose.Types.ObjectId(userId);
    
    // Find all listings
    const allListings = await Listing.find({});
    const userListings = await Listing.find({ userRef: userObjectId });
    
    return res.json({
      success: true,
      userId,
      totalListings: allListings.length,
      userListings: userListings,
      userListingsCount: userListings.length
    });
  } catch (error) {
    console.error('Debug route error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;