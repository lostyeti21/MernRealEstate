import express from 'express';
import { verifyToken } from '../utils/verifyUser.js';
import {
  recordSearch,
  getListingSearchAnalytics,
  getUserSearchAnalytics
} from '../controllers/searchAnalytics.controller.js';

const router = express.Router();

// Record a search term
router.post('/record/:listingId', recordSearch);

// Get search analytics for a specific listing
router.get('/listing/:listingId', verifyToken, getListingSearchAnalytics);

// Get aggregated search analytics for all user listings
router.get('/user/:userId', verifyToken, getUserSearchAnalytics);

export default router;
