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
router.get("/get", getListings); 
router.get("/get/:id", getListing);

// Protected routes - require authentication
router.use(verifyToken);

// User routes
router.get('/user/:id', getUserListings);

// Agent routes
router.get('/agent/:id', getAgentListings);
router.post("/create", createListing);
router.post("/update/:id", updateListing);
router.delete("/delete/:id", deleteListing);

// Express interest in a listing
router.post('/:id/interest', expressInterest);

export default router;