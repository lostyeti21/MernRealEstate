import express from 'express';
import { 
  getUserNotifications, 
  createNotification, 
  deleteNotification, 
  getUnreadStatus, 
  getUnreadCount,
  markNotificationAsRead,
  getScheduleNotifications,
  createSuperUserNotification 
} from '../controllers/notification.controller.js';
import { verifyToken } from '../utils/verifyUser.js';

const router = express.Router();

// Get all notifications
router.get('/', verifyToken, getUserNotifications);

// Get user notifications
router.get('/user/:userId', verifyToken, getUserNotifications);

// Get schedule notifications
router.get('/schedule', verifyToken, getScheduleNotifications);
router.get('/schedule/:userId', verifyToken, getScheduleNotifications);

// Get unread status and count
router.get('/unread', verifyToken, getUnreadStatus);
router.get('/unread/count', verifyToken, getUnreadCount);

// Create and update notifications
router.post('/create', verifyToken, createNotification);
router.post('/create-super-notification', verifyToken, createSuperUserNotification);
router.put('/:notificationId/read', verifyToken, markNotificationAsRead);
router.put('/read/:id', verifyToken, markNotificationAsRead);

// Delete notification
router.delete('/:type/:ratingId', verifyToken, deleteNotification);
router.delete('/:id', verifyToken, deleteNotification);

export default router;
