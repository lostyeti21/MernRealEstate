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
      .sort({ createdAt: -1 });

    console.log('Found direct notifications:', {
      count: notifications.length,
      sample: notifications[0]
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

    // Format direct notifications
    const formattedNotifications = notifications.map(notification => ({
      id: notification._id.toString(),
      type: notification.type,
      message: notification.message,
      from: notification.from ? {
        id: notification.from._id.toString(),
        username: notification.from.username || 'System',
        avatar: notification.from.avatar || ''
      } : null,
      date: notification.createdAt,
      read: notification.read
    }));

    console.log('Formatted notifications:', {
      directCount: formattedNotifications.length,
      tenantCount: formattedTenantRatings.length,
      landlordCount: formattedLandlordRatings.length
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

    if (!['tenant', 'landlord'].includes(type)) {
      console.log('Invalid notification type:', type);
      return next(errorHandler(400, 'Invalid notification type'));
    }

    if (type === 'landlord') {
      // Delete landlord rating
      console.log('Deleting landlord rating...');
      const result = await User.updateOne(
        { _id: userId },
        { $pull: { ratings: { _id: mongoose.Types.ObjectId(ratingId) } } }
      );

      if (result.modifiedCount === 0) {
        console.log('Rating not found or not modified:', ratingId);
        return next(errorHandler(404, 'Rating not found'));
      }

      console.log('Landlord rating deleted successfully');
    } else {
      // Delete tenant rating
      console.log('Deleting tenant rating...');
      const result = await TenantRating.deleteOne({
        _id: ratingId,
        tenant: userId
      });

      if (result.deletedCount === 0) {
        console.log('Rating not found:', ratingId);
        return next(errorHandler(404, 'Rating not found'));
      }

      console.log('Tenant rating deleted successfully');
    }

    res.status(200).json({
      success: true,
      message: 'Notification deleted successfully'
    });
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
