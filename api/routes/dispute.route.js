import express from 'express';
import { verifyToken } from '../utils/verifyUser.js';
import { 
  disputeRating,
  getDisputes,
  handleDisputeAction,
  checkDispute
} from '../controllers/dispute.controller.js';

const router = express.Router();

// SuperUser middleware
const verifySuperUser = (req, res, next) => {
  const superUserAuth = req.headers['x-super-user-auth'];
  
  if (superUserAuth !== 'ishe') {
    return res.status(401).json({
      success: false,
      statusCode: 401,
      message: 'Unauthorized'
    });
  }
  
  next();
};

// Dispute routes
router.post('/create', verifyToken, disputeRating);  // Create new dispute
router.get('/check/:ratingId', verifyToken, checkDispute);  // Check if rating is disputed
router.get('/', verifySuperUser, getDisputes);  // Get all disputes (SuperUser only)
router.put('/:id/:action', verifySuperUser, handleDisputeAction);  // Handle dispute actions (SuperUser only)

export default router;
