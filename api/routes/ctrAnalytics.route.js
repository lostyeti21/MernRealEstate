import express from 'express';
import { verifyToken } from '../utils/verifyUser.js';
import {
  recordImpression,
  recordClick,
  getListingCTRAnalytics,
  getUserCTRAnalytics
} from '../controllers/ctrAnalytics.controller.js';

const router = express.Router();

// Record impression and click
router.post('/impression/:listingId', recordImpression);
router.post('/click/:listingId', recordClick);

// Get analytics
router.get('/listing/:listingId', verifyToken, getListingCTRAnalytics);
router.get('/user/:userId', verifyToken, getUserCTRAnalytics);

export default router;
