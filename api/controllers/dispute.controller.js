import { errorHandler } from '../utils/error.js';
import User from '../models/user.model.js';
import TenantRating from '../models/tenantRating.model.js';
import LandlordRating from '../models/landlordRating.model.js';
import Dispute from '../models/dispute.model.js';
import Notification from '../models/notification.model.js';

export const disputeRating = async (req, res, next) => {
  try {
    const { ratingId, ratingType, categories, reason, reasonType } = req.body;
    console.log('Creating dispute:', { ratingId, ratingType, categories, reason, reasonType });

    // Validate required fields
    if (!ratingId || !ratingType || !categories || !categories.length || !reason || !reasonType) {
      console.error('Missing required fields:', { ratingId, ratingType, categories, reason, reasonType });
      return next(errorHandler(400, 'Missing required fields'));
    }

    // Get the rating based on type
    const RatingModel = ratingType === 'tenant' ? TenantRating : LandlordRating;
    const rating = await RatingModel.findById(ratingId);

    if (!rating) {
      console.error('Rating not found:', { ratingId, ratingType });
      return next(errorHandler(404, 'Rating not found'));
    }

    // Check if rating is already disputed
    const existingDispute = await Dispute.findOne({ rating: ratingId });
    if (existingDispute) {
      console.error('Rating already disputed:', { ratingId, disputeId: existingDispute._id });
      return next(errorHandler(400, 'This rating is already disputed'));
    }

    // Create dispute
    const dispute = await Dispute.create({
      rating: ratingId,
      ratingType,
      categories,
      reason,
      reasonType,
      disputedBy: req.user.id,
      ratedBy: rating.ratedBy,
      status: 'pending',
      createdAt: new Date()
    });

    await dispute.populate(['disputedBy', 'ratedBy']);

    console.log('Created dispute:', {
      id: dispute._id,
      status: dispute.status,
      disputedBy: dispute.disputedBy?.username
    });

    res.status(201).json({
      success: true,
      message: 'Dispute created successfully',
      dispute: {
        _id: dispute._id,
        status: dispute.status,
        disputedBy: {
          id: dispute.disputedBy._id,
          username: dispute.disputedBy.username
        }
      }
    });
  } catch (error) {
    console.error('Error creating dispute:', error);
    next(errorHandler(500, error.message || 'Error creating dispute'));
  }
};

export const getDisputes = async (req, res, next) => {
  try {
    console.log('Getting disputes...');
    
    const disputes = await Dispute.find()
      .populate('disputedBy', 'username avatar')
      .populate('ratedBy', 'username avatar')
      .sort({ createdAt: -1 });

    console.log('Found disputes:', {
      count: disputes.length,
      sample: disputes[0]
    });

    res.status(200).json(disputes);
  } catch (error) {
    console.error('Error in getDisputes:', {
      error: error.message,
      stack: error.stack,
      params: req.params,
      body: req.body
    });
    next(errorHandler(500, error.message || 'Error fetching disputes'));
  }
};

export const handleDisputeAction = async (req, res, next) => {
  try {
    const { id: disputeId, action } = req.params;
    console.log('Handling dispute action:', { disputeId, action });

    if (!['approve', 'reject'].includes(action)) {
      console.log('Invalid action:', action);
      return next(errorHandler(400, 'Invalid action'));
    }

    const dispute = await Dispute.findById(disputeId)
      .populate('disputedBy', 'username email')
      .populate('ratedBy', 'username');

    console.log('Found dispute:', {
      id: disputeId,
      disputedBy: dispute?.disputedBy,
      status: dispute?.status
    });

    if (!dispute) {
      console.log('Dispute not found:', { disputeId, action });
      return next(errorHandler(404, 'Dispute not found'));
    }

    if (dispute.status !== 'pending') {
      console.log('Dispute not pending:', { disputeId, status: dispute.status });
      return next(errorHandler(400, 'Can only take action on pending disputes'));
    }

    // Update dispute status
    dispute.status = action === 'approve' ? 'approved' : 'rejected';
    await dispute.save();
    console.log('Updated dispute status:', dispute.status);

    // Create notification for the user
    if (action === 'reject') {
      try {
        const notificationData = {
          to: dispute.disputedBy._id,
          message: `Your dispute (ID: ${disputeId.slice(-6).toUpperCase()}) has been rejected. Please contact customer care at justlistit@outlook.com if you wish for more information as to why.`,
          type: 'dispute_rejected',
          systemInfo: {
            name: 'JustListIt Support',
            avatar: logo
          },
          read: false,
          createdAt: new Date()
        };

        console.log('Creating rejection notification:', notificationData);

        // Create notification directly using the model
        const notification = await Notification.create(notificationData);

        console.log('Created notification:', {
          id: notification._id,
          to: notification.to,
          type: notification.type,
          message: notification.message
        });
      } catch (notificationError) {
        console.error('Error creating notification:', {
          error: notificationError.message,
          stack: notificationError.stack,
          dispute: disputeId,
          user: dispute.disputedBy._id
        });
      }
    }

    res.status(200).json({
      success: true,
      message: `Dispute ${action}ed successfully`,
      dispute
    });

  } catch (error) {
    console.error('Error in handleDisputeAction:', {
      error: error.message,
      stack: error.stack,
      disputeId,
      action
    });
    next(errorHandler(500, error.message || `Error ${action}ing dispute`));
  }
};

export const checkDispute = async (req, res, next) => {
  try {
    const { ratingId } = req.params;
    console.log('Checking dispute status for rating:', ratingId);

    // Find existing dispute
    const dispute = await Dispute.findOne({ rating: ratingId })
      .populate('disputedBy', 'username');

    console.log('Found dispute:', dispute ? {
      id: dispute._id,
      status: dispute.status,
      disputedBy: dispute.disputedBy?.username
    } : 'No dispute found');

    // Get the rating type
    let ratingType;
    const tenantRating = await TenantRating.findById(ratingId);
    if (tenantRating) {
      ratingType = 'tenant';
    } else {
      const landlordRating = await LandlordRating.findById(ratingId);
      if (landlordRating) {
        ratingType = 'landlord';
      }
    }

    if (!dispute) {
      return res.status(200).json({
        disputed: false,
        ratingType
      });
    }

    res.status(200).json({
      disputed: true,
      ratingType,
      dispute: {
        _id: dispute._id,
        status: dispute.status,
        createdAt: dispute.createdAt,
        disputedBy: {
          id: dispute.disputedBy._id,
          username: dispute.disputedBy.username
        }
      }
    });
  } catch (error) {
    console.error('Error checking dispute status:', error);
    next(errorHandler(500, error.message || 'Error checking dispute status'));
  }
};
