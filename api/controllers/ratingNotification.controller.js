import RatingNotification from '../models/ratingNotification.model.js';
import User from '../models/user.model.js';
import Notification from '../models/notification.model.js';

export const createRatingNotification = async (req, res, next) => {
  try {
    console.log('Received rating notification request:', {
      body: req.body,
      user: req.user
    });

    const { 
      ratedUser, 
      ratedBy, 
      ratingType, 
      ratingDetails 
    } = req.body;

    // Validate input with more detailed logging
    if (!ratedUser) {
      console.error('Missing ratedUser');
      return res.status(400).json({ message: 'Missing ratedUser' });
    }
    if (!ratedBy) {
      console.error('Missing ratedBy');
      return res.status(400).json({ message: 'Missing ratedBy' });
    }
    if (!ratingType) {
      console.error('Missing ratingType');
      return res.status(400).json({ message: 'Missing ratingType' });
    }
    if (!ratingDetails) {
      console.error('Missing ratingDetails');
      return res.status(400).json({ message: 'Missing ratingDetails' });
    }

    // Validate ratedUser and ratedBy exist
    const ratedUserExists = await User.findById(ratedUser);
    const ratedByUserExists = await User.findById(ratedBy);

    if (!ratedUserExists) {
      console.error('Rated user not found');
      return res.status(404).json({ message: 'Rated user not found' });
    }
    if (!ratedByUserExists) {
      console.error('Rating user not found');
      return res.status(404).json({ message: 'Rating user not found' });
    }

    // Create system notification for the rated user
    const notification = new Notification({
      type: 'rating',
      title: 'New Rating Received',
      content: `You have received a new ${ratingType} rating. Overall Rating: ${ratingDetails.overall?.toFixed(1) || 'N/A'}/5`,
      from: ratedBy,
      to: ratedUser,
      seen: false,
      data: {
        ratingType,
        ratingDetails: {
          communication: ratingDetails.communication || 0,
          cleanliness: ratingDetails.cleanliness || 0,
          reliability: ratingDetails.reliability || 0,
          overall: ratingDetails.overall || 0
        },
        ratedBy: {
          _id: ratedBy,
          username: ratedByUserExists.username,
          avatar: ratedByUserExists.avatar
        }
      }
    });

    const savedNotification = await notification.save();
    console.log('System notification saved:', {
      notificationId: savedNotification._id,
      to: ratedUserExists.username,
      from: ratedByUserExists.username
    });

    res.status(201).json({ 
      notification: savedNotification 
    });
  } catch (error) {
    console.error('Error in createRatingNotification:', error);
    
    // More detailed error response
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        details: Object.values(error.errors).map(err => err.message)
      });
    }

    next(error);
  }
};

export const getRatingNotificationsForUser = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const ratingNotifications = await RatingNotification.find({ 
      ratedUser: userId 
    })
    .populate('ratedBy', 'username avatar')
    .sort({ createdAt: -1 });

    res.status(200).json(ratingNotifications);
  } catch (error) {
    next(error);
  }
};

export const markRatingNotificationAsRead = async (req, res, next) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;

    const ratingNotification = await RatingNotification.findOneAndUpdate(
      { _id: notificationId, ratedUser: userId },
      { read: true },
      { new: true }
    );

    if (!ratingNotification) {
      return res.status(404).json({ message: 'Rating notification not found' });
    }

    res.status(200).json(ratingNotification);
  } catch (error) {
    next(error);
  }
};

export const deleteRatingNotification = async (req, res, next) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;

    const ratingNotification = await RatingNotification.findOneAndDelete({ 
      _id: notificationId, 
      ratedUser: userId 
    });

    if (!ratingNotification) {
      return res.status(404).json({ message: 'Rating notification not found' });
    }

    res.status(200).json({ message: 'Rating notification deleted successfully' });
  } catch (error) {
    next(error);
  }
};
