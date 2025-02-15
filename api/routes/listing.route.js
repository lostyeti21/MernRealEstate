import express from 'express';
import {
  createListing,
  deleteListing,
  updateListing,
  getListing,
  getListings,
  getAgentListings,
  getUserListings,
  expressInterest,
  getAllListings
} from "../controllers/listing.controller.js";
import { verifyToken, verifySuperuser } from '../utils/verifyUser.js';
import { errorHandler } from '../utils/error.js';

const router = express.Router();

// Superuser routes - must be first to avoid conflicts
router.get('/super/all', verifySuperuser, getAllListings);

// Public routes
router.get('/get', getListings);
router.get('/:id', getListing);

// Protected routes - require authentication
router.use(verifyToken);

// User routes
router.get('/user/:id', getUserListings);
router.post('/create', createListing);
router.delete('/delete/:id', deleteListing);
router.post('/update/:id', updateListing);

// Express interest in a listing
router.post('/:id/interest', expressInterest);

// Agent routes
router.get('/agent/:id', getAgentListings);

export default router;