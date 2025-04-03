import express from 'express';
import { setFeaturedListing, getFeaturedListing } from '../controllers/featured.controller.js';
import { verifyToken } from '../utils/verifyUser.js';

const router = express.Router();

// Temporarily remove verifyToken middleware for testing
router.post('/set', setFeaturedListing);
router.get('/get', getFeaturedListing);

export default router;
