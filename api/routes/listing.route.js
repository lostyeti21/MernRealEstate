import express from "express";
import mongoose from "mongoose";
import { verifyToken } from "../utils/verifyUser.js";
import {
  createListing,
  deleteListing,
  updateListing,
  getListing,
  getUserListings,
  getListings
} from "../controllers/listing.controller.js";

const router = express.Router();

// Routes for managing listings
router.post("/create", verifyToken, createListing);
router.delete("/delete/:id", verifyToken, deleteListing);
router.post("/update/:id", verifyToken, updateListing);
router.get("/get/:id", getListing);
router.get("/user/:id", getUserListings);
router.get('/get', getListings);

export default router;