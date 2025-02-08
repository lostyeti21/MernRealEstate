import express from 'express';
import { verifyToken } from '../utils/verifyUser.js';
import { 
  rateTenant, 
  getTenantRatings, 
  checkIfRated 
} from '../controllers/tenantRating.controller.js';

const router = express.Router();

// Rate a tenant
router.post('/rate/:tenantId', verifyToken, rateTenant);

// Get tenant ratings
router.get('/:tenantId', getTenantRatings);

// Check if user has rated a tenant
router.get('/check/:tenantId', verifyToken, checkIfRated);

export default router;
