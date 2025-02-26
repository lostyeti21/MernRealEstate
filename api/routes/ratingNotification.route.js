import express from 'express';
import { 
  createRatingNotification, 
  getRatingNotificationsForUser, 
  markRatingNotificationAsRead,
  deleteRatingNotification 
} from '../controllers/ratingNotification.controller.js';
import { verifyToken } from '../utils/verifyUser.js';

const router = express.Router();

// Create a new rating notification
router.post('/create', verifyToken, createRatingNotification);

// Get rating notifications for a specific user
router.get('/user', verifyToken, getRatingNotificationsForUser);

// Mark a specific rating notification as read
router.put('/:notificationId/read', verifyToken, markRatingNotificationAsRead);

// Delete a specific rating notification
router.delete('/:notificationId', verifyToken, deleteRatingNotification);

export default router;
