import User from '../models/user.model.js';
import TenantRating from '../models/tenantRating.model.js';
import LandlordRating from '../models/landlordRating.model.js';
import Notification from '../models/notification.model.js';
import { errorHandler } from '../utils/error.js';
import mongoose from 'mongoose';
import Reservation from '../models/reservation.model.js';
import Listing from '../models/listing.model.js';

export const getUserNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;
    console.log('Fetching notifications for user:', userId);

    const user = await User.findById(userId);
    if (!user) {
      console.log('User not found');
      return next(errorHandler(404, 'User not found'));
    }

    // Get notifications from the Notification model, excluding viewing_request type
    const allNotifications = await Notification.find({ 
      to: userId,
      type: { $ne: 'viewing_request' } // Exclude viewing_request notifications
    })
      .populate('to', 'username avatar')
      .populate('from', 'username avatar')
      .populate('reservationId')
      .sort({ createdAt: -1 });

    // Split notifications into seen and unseen
    const seen = allNotifications.filter(notification => notification.read);
    const unseen = allNotifications.filter(notification => !notification.read);

    console.log('Found notifications:', {
      total: allNotifications.length,
      seen: seen.length,
      unseen: unseen.length
    });

    res.json({
      seen,
      unseen
    });
  } catch (error) {
    console.error('Error in getUserNotifications:', error);
    next(error);
  }
};

export const getNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;
    console.log('Fetching notifications for user:', userId);

    // Get all notifications for this user
    const notifications = await Notification.find({ 
      $or: [{ to: userId }, { from: userId }]
    })
    .populate('from', 'username avatar')
    .populate('to', 'username avatar')
    .sort({ createdAt: -1 });

    console.log('Found notifications:', notifications.length);

    // Split into seen and unseen
    const seen = notifications.filter(n => n.read);
    const unseen = notifications.filter(n => !n.read);

    res.status(200).json({
      success: true,
      seen,
      unseen
    });
  } catch (error) {
    next(error);
  }
};

export const createNotification = async (req, res, next) => {
  try {
    console.log(' [NotificationController] Creating new notification:', {
      type: req.body.type,
      from: req.body.from,
      to: req.body.to,
      data: req.body.data
    });

    const notification = await Notification.create(req.body);
    
    // Populate user data if 'from' is a user ID
    let populatedNotification = notification;
    if (notification.from && notification.from !== 'system') {
      populatedNotification = await Notification.findById(notification._id)
        .populate('from', 'username avatar')
        .populate('to', 'username avatar');
    }

    console.log(' [NotificationController] Notification created successfully:', {
      id: notification._id,
      type: notification.type,
      to: notification.to,
      createdAt: notification.createdAt
    });

    res.status(201).json(populatedNotification);
  } catch (error) {
    console.error(' [NotificationController] Error creating notification:', {
      error: error.message,
      stack: error.stack,
      requestBody: req.body
    });
    next(error);
  }
};

export const createSuperUserNotification = async (req, res, next) => {
  try {
    const { type, from, message, data } = req.body;
    console.log('Creating SuperUser notification:', { type, from, data });

    // Find all SuperUsers
    const superUsers = await User.find({ isSuperUser: true });
    console.log('Found SuperUsers:', superUsers.length);

    // Create notifications for each SuperUser
    const notifications = await Promise.all(
      superUsers.map(async (superUser) => {
        const notification = new Notification({
          type,
          from,
          to: superUser._id,
          message,
          data,
          read: false
        });
        return notification.save();
      })
    );

    // Populate user data
    const populatedNotifications = await Notification.populate(notifications, [
      { path: 'from', select: 'username avatar' },
      { path: 'to', select: 'username avatar' }
    ]);

    res.status(201).json({
      success: true,
      notifications: populatedNotifications
    });
  } catch (error) {
    next(error);
  }
};

export const deleteNotification = async (req, res, next) => {
  try {
    const { type, ratingId, id } = req.params;
    const userId = req.user.id;

    let deletedNotification;

    // If an ID is provided, delete by ID
    if (id) {
      deletedNotification = await Notification.findOneAndDelete({ 
        _id: id, 
        to: userId 
      });
    } 
    // If type and ratingId are provided, delete by type and ratingId
    else if (type && ratingId) {
      deletedNotification = await Notification.findOneAndDelete({ 
        type, 
        'data.ratingId': ratingId,
        to: userId
      });
    } 
    // If only type is provided, delete the first matching notification
    else if (type) {
      deletedNotification = await Notification.findOneAndDelete({ 
        type,
        to: userId
      });
    }
    else {
      return res.status(400).json({ message: 'Invalid deletion parameters' });
    }

    if (!deletedNotification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ 
      message: 'Notification deleted successfully', 
      deletedNotification 
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    next(error);
  }
};

export const getUnreadCount = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Count unread notifications excluding viewing requests (handled in Schedule page)
    const count = await Notification.countDocuments({ 
      to: userId, 
      read: false,
      type: { $ne: 'viewing_request' }  // Exclude viewing requests from count
    });

    console.log(`Unread notifications count for user ${userId}:`, count);
    
    res.json({ count });
  } catch (error) {
    console.error('Error getting unread count:', error);
    next(error);
  }
};

export const getUnreadStatus = getUnreadCount;

export const markNotificationAsRead = async (req, res, next) => {
  try {
    const { notificationId } = req.params;
    const notification = await Notification.findByIdAndUpdate(
      notificationId,
      { read: true },
      { new: true }
    );
    if (!notification) {
      return next(errorHandler(404, 'Notification not found'));
    }
    res.json(notification);
  } catch (error) {
    next(error);
  }
};

export const getScheduleNotifications = async (req, res) => {
  try {
    const userId = req.params.userId;

    // Find notifications related to viewing schedules
    const notifications = await Notification.find({
      $or: [{ to: userId }, { from: userId }],
      type: { $in: ['viewing_request', 'viewing_response'] }
    })
    .populate('from', 'username email phoneNumbers')
    .populate('to', 'username email phoneNumbers')
    .sort({ createdAt: -1 });

    // For each notification, populate the associated reservations and listing details
    const populatedNotifications = await Promise.all(notifications.map(async (notification) => {
      const notificationObj = {
        _id: notification._id,
        type: notification.type,
        status: notification.status,
        createdAt: notification.createdAt,
        from: notification.from,
        to: notification.to,
        data: notification.data || {}
      };
      
      if (notificationObj.data && (notificationObj.data.reservation || notificationObj.data.reservations)) {
        // Handle both single and multiple reservations
        const reservationIds = notificationObj.data.reservations 
          ? notificationObj.data.reservations.map(r => r._id || r)
          : [notificationObj.data.reservation._id || notificationObj.data.reservation];

        const reservations = await Reservation.find({
          _id: { $in: reservationIds }
        }).populate('listing');

        // Get the listing details from the first reservation
        const listing = reservations[0]?.listing;

        // Update the notification data with full reservation and listing details
        notificationObj.data = {
          ...notificationObj.data,
          reservations: reservations.map(reservation => ({
            _id: reservation._id,
            date: reservation.date,
            startTime: reservation.startTime,
            endTime: reservation.endTime,
            status: reservation.status,
            rejectionReason: reservation.rejectionReason
          })),
          listing: listing ? {
            _id: listing._id,
            name: listing.name,
            address: listing.address,
            type: listing.type,
            furnished: listing.furnished,
            viewingSchedule: listing.viewingSchedule
          } : null
        };
      }

      return notificationObj;
    }));

    res.status(200).json({
      success: true,
      notifications: populatedNotifications
    });

  } catch (error) {
    console.error('Error getting schedule notifications:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error retrieving notifications'
    });
  }
};

export const getSuperUserNotifications = async (req, res, next) => {
  try {
    // Verify SuperUser auth
    const superUserAuth = req.headers['x-super-user-auth'];
    if (superUserAuth !== 'ishe') {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    console.log('Fetching SuperUser notifications...');

    // Get all dispute notifications
    const notifications = await Notification.find({ 
      type: { $regex: /^dispute_/ }
    })
    .populate('from', 'username avatar')
    .populate('to', 'username avatar')
    .sort({ createdAt: -1 });

    console.log('Found notifications:', {
      count: notifications.length,
      types: notifications.map(n => n.type)
    });

    // Format notifications
    const formattedNotifications = notifications.map(notification => {
      // Get dispute details from either the original notification or the resolution notification
      const originalDispute = notification.data?.originalDispute || {};
      const disputeDetails = notification.data?.disputeDetails || {};
      
      // Combine dispute details from all possible sources
      const combinedDisputeDetails = {
        _id: disputeDetails._id || originalDispute._id || notification.data?.ratingId,
        id: disputeDetails.id || originalDispute.id || notification.data?.disputeId || notification.data?.id,
        disputerName: disputeDetails.disputerName || originalDispute.disputerName || notification.data?.disputerName,
        raterName: disputeDetails.raterName || originalDispute.raterName || notification.data?.raterName,
        categories: disputeDetails.categories || originalDispute.categories || disputeDetails.disputedCategories || notification.data?.categories || [],
        ratings: disputeDetails.ratings || originalDispute.ratings || disputeDetails.disputedRatings || notification.data?.ratings || [],
        reason: disputeDetails.reason || originalDispute.reason || disputeDetails.disputeReason || notification.data?.reason,
        reasonType: disputeDetails.reasonType || originalDispute.reasonType || disputeDetails.disputeReasonType || notification.data?.reasonType,
        status: disputeDetails.status || originalDispute.status || notification.data?.status || 'pending',
        createdAt: disputeDetails.createdAt || originalDispute.createdAt || notification.createdAt,
        updatedAt: disputeDetails.updatedAt || originalDispute.updatedAt || notification.data?.updatedAt
      };

      return {
        _id: notification._id,
        type: notification.type,
        from: notification.from ? {
          _id: notification.from._id,
          username: notification.from.username,
          avatar: notification.from.avatar || '/default-avatar.png'
        } : null,
        to: notification.to ? {
          _id: notification.to._id,
          username: notification.to.username,
          avatar: notification.to.avatar || '/default-avatar.png'
        } : null,
        message: notification.content,
        data: {
          disputeId: combinedDisputeDetails.id,
          disputeDetails: combinedDisputeDetails,
          originalDispute: combinedDisputeDetails
        },
        createdAt: notification.createdAt,
        read: notification.read
      };
    });

    // Split into seen and unseen
    const seen = formattedNotifications.filter(n => n.read);
    const unseen = formattedNotifications.filter(n => !n.read);

    console.log('Final notification counts:', {
      seen: seen.length,
      unseen: unseen.length
    });

    res.status(200).json({
      success: true,
      seen,
      unseen
    });

  } catch (error) {
    console.error('Error fetching SuperUser notifications:', error);
    next(error);
  }
};

export const handleRatingDispute = async (req, res, next) => {
  try {
    console.log('Handling rating dispute. Request body:', JSON.stringify(req.body, null, 2));
    console.log('User from token:', req.user);
    
    const { id, disputeId, ratingId, ratingType, categories, reason, reasonType, disputerName, raterName } = req.body;

    if (!ratingId || !ratingType || !categories || !reason || !reasonType) {
      console.error('Missing required fields:', { ratingId, ratingType, categories, reason, reasonType });
      return next(errorHandler(400, 'Missing required fields'));
    }

    // Use the frontend-generated ID or generate a new one
    const finalDisputeId = id || disputeId || Date.now().toString();

    // Create a new dispute notification
    const disputeNotification = new Notification({
      type: 'dispute_submitted',
      from: req.user.id,
      to: req.user.id, // Initially set to disputer
      message: `Your dispute for the rating from ${raterName} has been submitted.`,
      data: {
        ratingId,
        id: finalDisputeId,
        disputeId: finalDisputeId,
        disputeDetails: {
          _id: ratingId,
          id: finalDisputeId,
          disputerName,
          raterName,
          categories,
          reason,
          reasonType,
          status: 'pending',
          createdAt: new Date()
        }
      },
      read: false,
      createdAt: new Date()
    });

    console.log('Creating dispute notification:', JSON.stringify(disputeNotification.toObject(), null, 2));

    try {
      await disputeNotification.save();
      console.log('Dispute notification saved successfully');
    } catch (error) {
      console.error('Error saving dispute notification:', error);
      throw error;
    }

    // Find all SuperUsers
    const superUsers = await User.find({ isSuperUser: true });
    console.log(`Found ${superUsers.length} SuperUsers`);

    // Create notifications for all SuperUsers
    const superUserNotifications = await Promise.all(
      superUsers.map(async (superUser) => {
        const notification = new Notification({
          type: 'dispute_received',
          from: req.user.id,
          to: superUser._id,
          message: `New dispute received from ${disputerName} against ${raterName}'s rating.`,
          data: {
            ratingId,
            id: finalDisputeId,
            disputeId: finalDisputeId,
            disputeDetails: {
              _id: ratingId,
              id: finalDisputeId,
              disputerName,
              raterName,
              categories,
              reason,
              reasonType,
              status: 'pending',
              createdAt: new Date()
            }
          },
          read: false,
          createdAt: new Date()
        });
        try {
          const saved = await notification.save();
          console.log(`Created notification for SuperUser ${superUser._id}`);
          return saved;
        } catch (error) {
          console.error(`Error creating notification for SuperUser ${superUser._id}:`, error);
          throw error;
        }
      })
    );

    console.log('Created dispute notifications:', {
      dispute: disputeNotification.toObject(),
      superUserNotifications: superUserNotifications.map(n => n.toObject())
    });

    res.status(201).json({ 
      success: true, 
      dispute: disputeNotification,
      message: 'Dispute submitted successfully'
    });
  } catch (error) {
    console.error('Error handling rating dispute:', error);
    next(error);
  }
};

export const sendSuperNotification = async (req, res, next) => {
  try {
    const {
      title,
      message,
      type,
      priority,
      action,
      targetUserId,
      fromSuperUser,
      systemInfo
    } = req.body;

    console.log('Creating super user notification:', {
      title,
      type,
      priority,
      targetUserId,
      fromSuperUser
    });

    // Validate required fields
    if (!title || !message || !targetUserId || !fromSuperUser) {
      console.error('Missing required fields for super notification');
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Create the notification
    const notification = await Notification.create({
      title,
      content: message,
      type,
      priority,
      action,
      to: targetUserId,
      from: fromSuperUser,
      systemInfo,
      read: false,
      createdAt: new Date()
    });

    console.log('Successfully created super notification:', notification._id);

    res.status(201).json({
      success: true,
      notification
    });
  } catch (error) {
    console.error('Error creating super notification:', error);
    next(error);
  }
};

export const createSuperNotification = async (req, res, next) => {
  try {
    const {
      title,
      message,
      type,
      priority,
      targetUserId,
      fromSuperUser,
      systemInfo
    } = req.body;

    console.log('Creating notification from SuperUser:', {
      title,
      type,
      priority,
      targetUserId
    });

    // Validate required fields
    if (!title || !message || !targetUserId) {
      console.error('Missing required fields for notification');
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Create the notification
    const notification = await Notification.create({
      title,
      content: message,
      type,
      priority,
      to: targetUserId,
      read: false,
      fromSuperUser: true,
      systemInfo,
      createdAt: new Date()
    });

    console.log('Successfully created notification:', notification._id);

    res.status(201).json({
      success: true,
      notification
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    next(error);
  }
};