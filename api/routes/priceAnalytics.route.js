import express from 'express';
import { verifyToken } from '../utils/verifyUser.js';
import {
  getListingPriceAnalytics,
  getUserPriceAnalytics
} from '../controllers/priceAnalytics.controller.js';

const router = express.Router();

// Get price analytics for a specific listing
router.get('/listing/:listingId', verifyToken, getListingPriceAnalytics);

// Get aggregated price analytics for all user listings
router.get('/user/:userId', verifyToken, getUserPriceAnalytics);

export default router;
