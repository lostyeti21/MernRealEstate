import express from 'express';
import { verifyToken } from '../utils/verifyUser.js';
import { 
  getUserNotifications, 
  deleteNotification,
  getUnreadStatus,
  getUnreadCount,
  createNotification
} from '../controllers/notification.controller.js';

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

router.get('/', verifyToken, getUserNotifications);
router.get('/unread/count', verifyToken, getUnreadCount);
router.get('/unread', verifyToken, getUnreadStatus);
router.delete('/:type/:ratingId', verifyToken, deleteNotification);
router.post('/', verifySuperUser, createNotification);

export default router;
