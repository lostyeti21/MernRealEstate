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

export const createNotification = async (req, res, next) => {
  try {
    const notification = await Notification.create(req.body);
    res.status(201).json(notification);
  } catch (error) {
    next(error);
  }
};

export const deleteNotification = async (req, res, next) => {
  try {
    const { type, ratingId } = req.params;
    await Notification.findOneAndDelete({ type, 'data.ratingId': ratingId });
    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
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