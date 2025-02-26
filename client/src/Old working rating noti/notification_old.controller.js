import User from '../models/user.model.js';
import TenantRating from '../models/tenantRating.model.js';
import LandlordRating from '../models/landlordRating.model.js';
import Notification from '../models/notification.model.js';
import { errorHandler } from '../utils/error.js';
import mongoose from 'mongoose';

export const getUserNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;
    console.log('Fetching notifications for user:', userId);

    const user = await User.findById(userId);
    if (!user) {
      console.log('User not found');
      return next(errorHandler(404, 'User not found'));
    }

    // Get notifications from the Notification model
    const notifications = await Notification.find({ to: userId })
      .populate('to', 'username avatar')
      .populate('from', 'username avatar')
      .populate('dispute.id')
      .sort({ createdAt: -1 });

    console.log('Found direct notifications:', {
      count: notifications.length,
      sample: notifications[0] ? {
        id: notifications[0]._id,
        type: notifications[0].type,
        dispute: notifications[0].dispute,
        categories: notifications[0].dispute?.categories
      } : null
    });

    // Get tenant ratings grouped by ratedBy and date
    const tenantRatings = await TenantRating.aggregate([
      { 
        $match: { 
          tenant: new mongoose.Types.ObjectId(userId) 
        } 
      },
      {
        $lookup: {
          from: 'users',
          localField: 'ratedBy',
          foreignField: '_id',
          as: 'rater'
        }
      },
      { $unwind: '$rater' },
      {
        $group: {
          _id: {
            ratedBy: '$ratedBy',
            date: {
              $dateToString: {
                format: '%Y-%m-%d %H:%M',
                date: '$createdAt'
              }
            }
          },
          categories: {
            $push: {
              id: '$_id',
              category: '$category',
              value: '$value'
            }
          },
          read: { $first: '$read' },
          comment: { $first: '$comment' },
          createdAt: { $first: '$createdAt' },
          rater: { $first: '$rater' }
        }
      }
    ]) || [];

    // Get landlord ratings grouped by ratedBy and date
    const landlordRatings = await LandlordRating.aggregate([
      { 
        $match: { 
          landlord: new mongoose.Types.ObjectId(userId) 
        } 
      },
      {
        $lookup: {
          from: 'users',
          localField: 'ratedBy',
          foreignField: '_id',
          as: 'rater'
        }
      },
      { $unwind: '$rater' },
      {
        $group: {
          _id: {
            ratedBy: '$ratedBy',
            date: {
              $dateToString: {
                format: '%Y-%m-%d %H:%M',
                date: '$createdAt'
              }
            }
          },
          categories: {
            $push: {
              id: '$_id',
              category: '$category',
              value: '$value'
            }
          },
          read: { $first: '$read' },
          comment: { $first: '$comment' },
          createdAt: { $first: '$createdAt' },
          rater: { $first: '$rater' }
        }
      }
    ]) || [];

    console.log('Raw ratings:', {
      tenantCount: tenantRatings.length,
      landlordCount: landlordRatings.length
    });

    // Format tenant ratings
    const formattedTenantRatings = tenantRatings.map(rating => ({
      id: rating.categories[0].id.toString(),
      type: 'rating',
      ratings: rating.categories.map(cat => ({
        ...cat,
        id: cat.id.toString()
      })),
      rater: {
        id: rating.rater._id.toString(),
        username: rating.rater.username || 'Unknown User',
        avatar: rating.rater.avatar || ''
      },
      date: rating.createdAt,
      comment: rating.comment || '',
      read: rating.read || false
    }));

    // Format landlord ratings
    const formattedLandlordRatings = landlordRatings.map(rating => ({
      id: rating.categories[0].id.toString(),
      type: 'rating',
      ratings: rating.categories.map(cat => ({
        ...cat,
        id: cat.id.toString()
      })),
      rater: {
        id: rating.rater._id.toString(),
        username: rating.rater.username || 'Unknown User',
        avatar: rating.rater.avatar || ''
      },
      date: rating.createdAt,
      comment: rating.comment || '',
      read: rating.read || false
    }));

    // Format notifications
    const formattedNotifications = notifications.map(notification => ({
      id: notification._id,
      message: notification.message,
      type: notification.type,
      systemInfo: notification.systemInfo,
      from: notification.from ? {
        id: notification.from._id,
        username: notification.from.username,
        avatar: notification.from.avatar || ''
      } : null,
      date: notification.createdAt,
      read: notification.read,
      dispute: notification.dispute ? {
        ...notification.dispute,
        categories: Array.isArray(notification.dispute.categories) 
          ? notification.dispute.categories 
          : []
      } : null
    }));

    console.log('Formatted notifications:', {
      count: formattedNotifications.length,
      sample: formattedNotifications[0]
    });

    // Combine all notifications and sort by date
    const allNotifications = [
      ...formattedNotifications,
      ...formattedLandlordRatings,
      ...formattedTenantRatings
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    // Split into seen and unseen
    const seen = allNotifications.filter(notification => notification.read);
    const unseen = allNotifications.filter(notification => !notification.read);

    console.log('Final notification counts:', { 
      seenCount: seen.length, 
      unseenCount: unseen.length,
      totalCount: allNotifications.length
    });

    res.status(200).json({
      seen,
      unseen
    });
  } catch (error) {
    console.error('Error in getUserNotifications:', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id
    });
    next(errorHandler(500, error.message || 'Error fetching notifications'));
  }
};

export const deleteNotification = async (req, res, next) => {
  try {
    console.log('Deleting notification for user:', req.user.id);
    const userId = req.user.id;
    const { type, ratingId } = req.params;

    // Validate parameters
    if (!ratingId || !mongoose.Types.ObjectId.isValid(ratingId)) {
      console.log('Invalid rating ID:', ratingId);
      return next(errorHandler(400, 'Invalid rating ID'));
    }

    // First try to find and delete a direct notification
    if (type === 'notification') {
      const result = await Notification.deleteOne({
        _id: ratingId,
        to: userId
      });

      if (result.deletedCount > 0) {
        return res.status(200).json({
          success: true,
          message: 'Notification deleted successfully'
        });
      }
    }

    // If type is 'rating', try both tenant and landlord ratings
    if (type === 'rating') {
      // Try deleting tenant rating
      const tenantResult = await TenantRating.deleteOne({
        _id: ratingId,
        tenant: userId
      });

      if (tenantResult.deletedCount > 0) {
        return res.status(200).json({
          success: true,
          message: 'Tenant rating notification deleted successfully'
        });
      }

      // Try deleting landlord rating
      const landlordResult = await LandlordRating.deleteOne({
        _id: ratingId,
        landlord: userId
      });

      if (landlordResult.deletedCount > 0) {
        return res.status(200).json({
          success: true,
          message: 'Landlord rating notification deleted successfully'
        });
      }
    }

    // If we get here, no notification was found to delete
    return next(errorHandler(404, 'Rating not found'));
  } catch (error) {
    console.error('Error in deleteNotification:', error);
    next(errorHandler(500, error.message || 'Error deleting notification'));
  }
};

export const getUnreadStatus = async (req, res, next) => {
  try {
    console.log('Getting unread status for user:', req.user.id);
    const userId = req.user.id;

    // Get user's notifications
    console.log('Fetching user data...');
    const user = await User.findById(userId)
      .select('ratings')
      .populate('ratings.ratedBy', 'username avatar')
      .lean();

    console.log('User data fetched:', { hasRatings: !!user?.ratings?.length });

    // Get tenant ratings
    console.log('Fetching tenant ratings...');
    const tenantRatings = await TenantRating.find({ tenant: userId })
      .populate('ratedBy', 'username avatar')
      .lean();

    console.log('Tenant ratings fetched:', { count: tenantRatings.length });

    // Check if there are any unread notifications
    const hasUnreadLandlordRatings = user?.ratings?.some(rating => !rating.read);
    const hasUnreadTenantRatings = tenantRatings.some(rating => !rating.read);

    const hasUnread = hasUnreadLandlordRatings || hasUnreadTenantRatings;

    console.log('Unread status:', { hasUnread });

    res.status(200).json({
      success: true,
      hasUnread
    });
  } catch (error) {
    console.error('Error in getUnreadStatus:', error);
    next(errorHandler(500, error.message || 'Error checking unread notifications'));
  }
};

export const getUnreadCount = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return next(errorHandler(404, 'User not found'));
    }

    // Count unread notifications
    const unreadCount = await TenantRating.countDocuments({
      tenant: user._id,
      read: false
    });

    res.status(200).json({ unreadCount });
  } catch (error) {
    next(error);
  }
};

export const createNotification = async (req, res, next) => {
  try {
    const { userId, message, type, from, rating, ratingType, systemInfo } = req.body;
    console.log('Creating notification:', { userId, message, type, systemInfo });

    // Validate required fields
    if (!userId || !message || !type) {
      console.error('Missing required fields:', { userId, message, type });
      return next(errorHandler(400, 'Missing required fields'));
    }

    // Create notification data with only required fields
    const notificationData = {
      to: userId,
      message,
      type,
      read: false,
      createdAt: new Date()
    };

    // Add optional fields if they exist
    if (from) notificationData.from = from;
    if (systemInfo) notificationData.systemInfo = systemInfo;
    if (rating && ratingType) {
      notificationData.rating = rating;
      notificationData.ratingType = ratingType;
    }

    console.log('Creating notification with data:', notificationData);

    const notification = await Notification.create(notificationData);
    console.log('Created notification:', notification);

    // Populate user fields if needed
    await notification.populate(['to', 'from'].filter(field => notification[field]));

    res.status(201).json({
      success: true,
      message: 'Notification created successfully',
      notification
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    next(errorHandler(500, error.message || 'Error creating notification'));
  }
};

export const markNotificationAsRead = async (req, res, next) => {
  try {
    const notificationId = req.params.id;
    const userId = req.user.id;

    // First try to find and update a direct notification
    const notification = await Notification.findOne({
      _id: notificationId,
      to: userId
    });

    if (notification) {
      notification.read = true;
      await notification.save();
      return res.status(200).json({
        success: true,
        message: 'Notification marked as read'
      });
    }

    // If not a direct notification, try to find and update a tenant rating
    const tenantRating = await TenantRating.findOne({
      _id: notificationId,
      tenant: userId
    });

    if (tenantRating) {
      tenantRating.read = true;
      await tenantRating.save();
      return res.status(200).json({
        success: true,
        message: 'Tenant rating notification marked as read'
      });
    }

    // If not a tenant rating, try to find and update a landlord rating
    const landlordRating = await LandlordRating.findOne({
      _id: notificationId,
      landlord: userId
    });

    if (landlordRating) {
      landlordRating.read = true;
      await landlordRating.save();
      return res.status(200).json({
        success: true,
        message: 'Landlord rating notification marked as read'
      });
    }

    // If we get here, no notification was found
    return next(errorHandler(404, 'Notification not found'));
  } catch (error) {
    next(error);
  }
};
