import express from "express";
import mongoose from "mongoose";
import {
  createListing,
  deleteListing,
  updateListing,
  getListing,
  getListings,
  getAgentListings
} from "../controllers/listing.controller.js";
import Listing from '../models/listing.model.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get("/get/:id", getListing);
router.get('/get', getListings);

// Protected routes - require authentication
router.use(verifyToken);

// Agent routes
router.get('/agent/:id', getAgentListings);
router.post("/create", createListing);
router.post("/update/:id", updateListing);
router.delete("/delete/:id", deleteListing);

export default router;