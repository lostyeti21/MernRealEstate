import express from 'express';
import { 
  getUserNotifications, 
  createNotification, 
  deleteNotification, 
  getUnreadStatus, 
  getUnreadCount,
  markNotificationAsRead,
  getScheduleNotifications,
  createSuperUserNotification,
  sendSuperNotification,
  getSuperUserNotifications,
  getUserUnreadNotificationsStatus
} from '../controllers/notification.controller.js';
import { verifyToken } from '../utils/verifyUser.js';

const router = express.Router();

// Verify superuser middleware
const verifySuperUser = (req, res, next) => {
  if (!req.user.isSuperUser) {
    return res.status(403).json({
      success: false,
      message: 'Only SuperUsers can perform this action'
    });
  }
  next();
};

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
router.get('/unread/:userId', verifyToken, getUserUnreadNotificationsStatus);

// Create and update notifications
router.post('/create', verifyToken, createNotification);
router.post('/create-super-notification', verifyToken, createSuperUserNotification);
router.put('/:notificationId/read', verifyToken, markNotificationAsRead);
router.put('/read/:id', verifyToken, markNotificationAsRead);

// Delete notification
router.delete('/:type/:ratingId', verifyToken, deleteNotification);
router.delete('/:id', verifyToken, deleteNotification);

router.put('/:id/mark-disputed', verifyToken, async (req, res) => {
  const { id } = req.params;
  
  try {
    console.log('Marking notification as disputed:', id);
    
    const notification = await Notification.findByIdAndUpdate(
      id,
      { disputed: true },
      { new: true }
    );

    if (!notification) {
      console.error('Notification not found:', id);
      return res.status(404).json({ message: 'Notification not found' });
    }

    console.log('Successfully marked notification as disputed:', notification._id);
    res.json(notification);
  } catch (error) {
    console.error('Error marking notification as disputed:', error);
    res.status(500).json({ message: 'Error marking notification as disputed' });
  }
});

router.get('/super-user', verifyToken, verifySuperUser, getSuperUserNotifications);

router.post('/send-super-notification', verifyToken, verifySuperUser, sendSuperNotification);

export default router;
