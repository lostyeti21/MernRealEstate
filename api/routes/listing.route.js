import express from "express";
import mongoose from "mongoose";
import {
  createListing,
  deleteListing,
  updateListing,
  getListing,
  getUserListings,
  getListings
} from "../controllers/listing.controller.js";
import Listing from '../models/listing.model.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Routes for managing listings
router.post("/create", verifyToken, createListing);
router.delete("/delete/:id", verifyToken, deleteListing);
router.post("/update/:id", verifyToken, updateListing);
router.get("/get/:id", getListing);
router.get("/user/:id", getUserListings);
router.get('/get', getListings);

// Get listings by agent ID
router.get('/agent/:agentId', verifyToken, async (req, res, next) => {
  try {
    const listings = await Listing.find({ userRef: req.params.agentId });
    res.status(200).json({
      success: true,
      listings
    });
  } catch (error) {
    next(error);
  }
});

export default router;