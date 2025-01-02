import express from 'express';
import { verifyToken } from '../utils/verifyUser.js';
import {
  recordView,
  getListingTimeAnalytics,
  getUserTimeAnalytics,
  resetTimeAnalytics
} from '../controllers/timeAnalytics.controller.js';

const router = express.Router();

// Record a view
router.post('/record/:listingId', recordView);

// Get time analytics for a specific listing
router.get('/listing/:listingId', verifyToken, getListingTimeAnalytics);

// Get aggregated time analytics for all user listings
router.get('/user/:userId', verifyToken, getUserTimeAnalytics);

// Reset time analytics (protected route)
router.post('/reset/:listingId', verifyToken, resetTimeAnalytics);

export default router;
