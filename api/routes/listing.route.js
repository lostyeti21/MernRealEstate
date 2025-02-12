import express from "express";
import {
  createListing,
  deleteListing,
  updateListing,
  getListing,
  getListings,
  getAgentListings,
  getUserListings,
  expressInterest
} from "../controllers/listing.controller.js";
import Listing from '../models/listing.model.js';
import { verifyToken } from '../utils/verifyUser.js';
import { errorHandler } from '../utils/error.js';

const router = express.Router();

// Public routes
router.get("/get/:id", getListing); 
router.get("/get", getListings); 

// Get listings by agent
router.get('/agent/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;
    const { sort = 'createdAt', order = 'desc', limit = 9 } = req.query;

    const listings = await Listing.find({ userRef: agentId })
      .sort({ [sort]: order === 'desc' ? -1 : 1 })
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      listings
    });
  } catch (error) {
    console.error('Error fetching agent listings:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching agent listings'
    });
  }
});

// Protected routes - require authentication
router.use(verifyToken);

// User routes
router.get('/user/:id', getUserListings);

// Agent routes
router.get('/agent/:id', getAgentListings);

// Protected routes
router.post("/create", createListing);
router.post("/update/:id", updateListing);
router.delete("/delete/:id", deleteListing);

// Express interest in a listing
router.post('/:id/interest', expressInterest);

export default router;