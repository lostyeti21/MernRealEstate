import { errorHandler } from '../utils/error.js';
import User from '../models/user.model.js';
import TenantRating from '../models/tenantRating.model.js';
import LandlordRating from '../models/landlordRating.model.js';
import Dispute from '../models/dispute.model.js';
import Notification from '../models/notification.model.js';

export const disputeRating = async (req, res, next) => {
  try {
    const { rating, ratingType, categories, reason, reasonType, disputedBy, ratedBy } = req.body;
    console.log('Creating dispute with data:', {
      rating,
      ratingType,
      categories,
      reason,
      reasonType,
      disputedBy,
      ratedBy
    });

    // Create dispute
    const dispute = await Dispute.create({
      rating,
      ratingType,
      categories: Array.isArray(categories) ? categories : [categories],
      reason,
      reasonType,
      disputedBy,
      ratedBy,
      status: 'pending',
      createdAt: new Date()
    });

    await dispute.populate(['disputedBy', 'ratedBy']);

    // Create notification for the rater
    try {
      const disputeReference = dispute._id.toString().slice(-6).toUpperCase();
      
      // Extract just the category names from the dispute categories
      const categoryNames = dispute.categories.map(cat => cat.category);
      
      console.log('Creating notification with categories:', categoryNames);
      
      const notificationData = {
        to: ratedBy,
        message: `Your ${ratingType} rating has been disputed. The dispute (ID: ${disputeReference}) is currently under review by our support team.`,
        type: 'dispute_submitted',
        systemInfo: {
          name: 'JustListIt Support',
          avatar: '/tiny logo.png'
        },
        dispute: {
          id: dispute._id,
          reason: reason,
          reasonType: reasonType,
          categories: categoryNames
        },
        read: false,
        createdAt: new Date()
      };

      console.log('Creating dispute notification with data:', JSON.stringify(notificationData, null, 2));

      // Create notification
      const notification = await Notification.create(notificationData);

      console.log('Created notification:', {
        id: notification._id,
        to: notification.to,
        type: notification.type,
        message: notification.message,
        dispute: notification.dispute
      });
    } catch (notificationError) {
      console.error('Error creating notification:', {
        error: notificationError.message,
        stack: notificationError.stack,
        dispute: dispute._id,
        user: ratedBy
      });
      // Don't throw the error as the dispute was still created successfully
    }

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
    // Log full request details
    console.log('Dispute Action Request:', {
      params: req.params,
      body: req.body,
      headers: {
        origin: req.headers.origin,
        host: req.headers.host,
        authorization: req.headers.authorization ? 'present' : 'missing',
        superUserAuth: req.headers['x-super-user-auth']
      }
    });

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
      currentStatus: dispute?.status
    });

    if (!dispute) {
      console.log('Dispute not found:', { disputeId, action });
      return next(errorHandler(404, 'Dispute not found'));
    }

    if (dispute.status !== 'pending') {
      console.log('Dispute not pending:', { disputeId, status: dispute.status });
      return next(errorHandler(400, 'Can only take action on pending disputes'));
    }

    // Update dispute status with explicit save and logging
    dispute.status = action === 'approve' ? 'resolved' : 'rejected';
    
    try {
      await dispute.save();
      console.log('Dispute status saved successfully:', {
        disputeId,
        newStatus: dispute.status
      });
    } catch (saveError) {
      console.error('Error saving dispute status:', {
        error: saveError.message,
        validationErrors: saveError.errors
      });
      return next(errorHandler(500, 'Failed to update dispute status'));
    }

    // Respond with success and include the updated dispute
    res.status(200).json({
      success: true,
      message: `Dispute ${action}ed successfully`,
      dispute: {
        _id: dispute._id,
        status: dispute.status,
        createdAt: dispute.createdAt,
        disputedBy: dispute.disputedBy,
        ratedBy: dispute.ratedBy
      }
    });

    // If approving, remove the disputed rating
    if (action === 'approve') {
      try {
        // Determine the correct rating model based on rating type
        const RatingModel = dispute.ratingType === 'tenant' ? TenantRating : LandlordRating;

        // Find the specific rating
        const rating = await RatingModel.findById(dispute.rating);

        if (rating) {
          console.log('Removing disputed rating:', {
            ratingId: rating._id,
            ratedUser: rating.ratedBy,
            ratingType: dispute.ratingType
          });

          // Remove the specific rating
          await RatingModel.findByIdAndDelete(rating._id);

          // Recalculate user's average rating after removing the disputed rating
          const remainingRatings = await RatingModel.find({ 
            ratedBy: rating.ratedBy,
            ratingType: dispute.ratingType
          });

          // Update user's rating statistics
          const userModel = dispute.ratingType === 'tenant' ? User : User;
          const updateFields = {
            averageRating: remainingRatings.length > 0 
              ? remainingRatings.reduce((sum, r) => sum + r.rating, 0) / remainingRatings.length 
              : 0,
            totalRatings: remainingRatings.length
          };

          await userModel.findByIdAndUpdate(rating.ratedBy, {
            $set: updateFields
          });

          console.log('Updated user rating statistics:', {
            userId: rating.ratedBy,
            averageRating: updateFields.averageRating,
            totalRatings: updateFields.totalRatings
          });
        }

        // Create notification for the rater
        const raterNotificationData = {
          to: dispute.ratedBy._id,
          message: `The Dispute (ID: ${disputeId.slice(-6).toUpperCase()}) started against you by ${dispute.disputedBy.username} was approved. The original rating you had made has been revoked. If you feel this is unjustified, please send an email with your dispute ID to justlistit@outlook.com.`,
          type: 'dispute_resolved',
          systemInfo: {
            name: 'JustListIt Support',
            avatar: '/tiny logo.png'
          },
          read: false,
          createdAt: new Date(),
          dispute: {
            id: dispute._id,
            reason: dispute.reason,
            reasonType: dispute.reasonType
          }
        };

        // Create notification for the disputer
        const disputerNotificationData = {
          to: dispute.disputedBy._id,
          message: `The dispute (ID: ${disputeId.slice(-6).toUpperCase()}) has been approved. The rating will now be revoked and not affect your overall rating.`,
          type: 'dispute_resolved',
          systemInfo: {
            name: 'JustListIt Support',
            avatar: '/tiny logo.png'
          },
          read: false,
          createdAt: new Date(),
          dispute: {
            id: dispute._id,
            reason: dispute.reason,
            reasonType: dispute.reasonType
          }
        };

        // Log notification creation details
        console.log('Creating Dispute Resolution Notifications:', {
          raterNotification: {
            to: raterNotificationData.to,
            message: raterNotificationData.message
          },
          disputerNotification: {
            to: disputerNotificationData.to,
            message: disputerNotificationData.message
          }
        });

        try {
          // Create notifications with error handling
          const raterNotification = await Notification.create(raterNotificationData);
          const disputerNotification = await Notification.create(disputerNotificationData);

          console.log('Notifications created successfully:', {
            raterNotificationId: raterNotification._id,
            disputerNotificationId: disputerNotification._id
          });
        } catch (notificationError) {
          console.error('Error creating dispute resolution notifications:', {
            error: notificationError.message,
            stack: notificationError.stack,
            raterNotificationData,
            disputerNotificationData
          });
        }
      } catch (ratingRemovalError) {
        console.error('Error removing disputed rating:', {
          error: ratingRemovalError.message,
          stack: ratingRemovalError.stack,
          disputeId: disputeId
        });
      }
    }

    // Create notification for the user
    if (action === 'reject') {
      try {
        // Notification for the disputer
        const disputerNotificationData = {
          to: dispute.disputedBy._id,
          message: `Your dispute (ID: ${disputeId.slice(-6).toUpperCase()}) has been rejected. The rating will remain unchanged. If you feel there is a mistake or want to dispute the judgement please email justlistit@outlook.com with your dispute ID.`,
          type: 'dispute_rejected',
          systemInfo: {
            name: 'JustListIt Support',
            avatar: '/tiny logo.png'
          },
          read: false,
          createdAt: new Date()
        };

        // Notification for the rater
        const raterNotificationData = {
          to: dispute.ratedBy._id,
          message: `The Dispute (ID: ${disputeId.slice(-6).toUpperCase()}) filed against your rating to ${dispute.disputedBy.username} has been rejected. Our team has deemed your rating was justified. The rating you submitted before will not be affected.`,
          type: 'dispute_rejected',
          systemInfo: {
            name: 'JustListIt Support',
            avatar: '/tiny logo.png'
          },
          read: false,
          createdAt: new Date()
        };

        console.log('Creating rejection notifications:', {
          disputerNotification: disputerNotificationData,
          raterNotification: raterNotificationData
        });

        // Create notifications directly using the model
        const [disputerNotification, raterNotification] = await Promise.all([
          Notification.create(disputerNotificationData),
          Notification.create(raterNotificationData)
        ]);

        console.log('Created notifications:', {
          disputerNotification: {
            id: disputerNotification._id,
            to: disputerNotification.to,
            type: disputerNotification.type,
            message: disputerNotification.message
          },
          raterNotification: {
            id: raterNotification._id,
            to: raterNotification.to,
            type: raterNotification.type,
            message: raterNotification.message
          }
        });
      } catch (notificationError) {
        console.error('Error creating notifications:', {
          error: notificationError.message,
          stack: notificationError.stack,
          dispute: disputeId,
          disputedBy: dispute.disputedBy._id,
          ratedBy: dispute.ratedBy._id
        });
      }
    }

  } catch (error) {
    console.error('Error in handleDisputeAction:', {
      error: error.message,
      stack: error.stack,
      params: req.params
    });
    next(errorHandler(500, error.message || `Error processing dispute action`));
  }
};

export const approveDispute = async (req, res, next) => {
  try {
    const { id } = req.params;
    console.log('Approving dispute:', id);

    // Get the dispute
    const dispute = await Dispute.findById(id)
      .populate('rating')
      .populate('disputedBy', 'username email')
      .populate('ratedBy', 'username email');

    if (!dispute) {
      console.error('Dispute not found:', id);
      return res.status(404).json({ message: 'Dispute not found' });
    }

    // Update dispute status
    dispute.status = 'approved';
    dispute.resolvedAt = new Date();
    dispute.resolvedBy = req.user._id;
    await dispute.save();

    console.log('Dispute approved:', dispute._id);

    // If there's a rating associated, mark it as disputed and invalid
    if (dispute.rating) {
      dispute.rating.disputed = true;
      dispute.rating.valid = false;
      await dispute.rating.save();
      console.log('Rating marked as disputed and invalid:', dispute.rating._id);
    }

    res.json({
      success: true,
      dispute,
      message: 'Dispute approved successfully'
    });
  } catch (error) {
    console.error('Error approving dispute:', error);
    next(error);
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
