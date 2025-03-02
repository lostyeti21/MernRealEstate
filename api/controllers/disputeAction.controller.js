import Notification from '../models/notification.model.js';
import { errorHandler } from '../utils/error.js';
import mongoose from 'mongoose';

export const updateDisputeStatus = async (req, res, next) => {
  try {
    const { disputeId, action } = req.params;
    console.log(`[disputeAction] Processing ${action} for dispute ${disputeId}`);

    // Validate action
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Must be either approve or reject'
      });
    }

    // Find notifications related to this dispute
    const notifications = await Notification.find({
      $or: [
        { 'data.disputeId': disputeId },
        { 'data.dispute.id': disputeId },
        { 'data.id': disputeId }
      ]
    }).populate('from to');

    if (!notifications || notifications.length === 0) {
      console.log(' [DisputeAction] No notifications found for dispute:', disputeId);
      return res.status(404).json({
        success: false,
        message: 'Dispute not found'
      });
    }

    console.log(' [DisputeAction] Found notifications:', notifications.length);

    // Update each notification
    const newStatus = action === 'approve' ? 'resolved' : 'rejected';
    for (const notification of notifications) {
      // Update dispute status in all possible locations
      if (notification.data?.disputeDetails) {
        notification.data.disputeDetails.status = newStatus;
      }
      if (notification.data?.dispute) {
        notification.data.dispute.status = newStatus;
      }
      notification.read = true;
      await notification.save();

      console.log(' [DisputeAction] Updated notification:', {
        id: notification._id,
        type: notification.type,
        newStatus
      });
    }

    // Find the original dispute notification
    const originalDispute = await Notification.findOne({
      'data.disputeId': disputeId,
      type: { $in: ['dispute_submitted', 'dispute_received'] }
    });

    if (!originalDispute) {
      console.error(`[disputeAction] Original dispute not found for ID: ${disputeId}`);
      return next(errorHandler(404, 'Dispute not found'));
    }

    console.log('[disputeAction] Found original dispute:', originalDispute);

    // Get the dispute details from the original notification
    const disputeDetails = originalDispute.data?.disputeDetails || {};
    const originalCategories = disputeDetails.categories || [];
    const originalRatings = disputeDetails.ratings || [];

    // Create resolution notifications
    const resolutionMessage = action === 'approve' 
      ? 'Your dispute has been approved. The rating will be removed from your profile.'
      : 'Your dispute has been rejected. The rating will remain on your profile.';

    // Get user IDs from the original notification
    const disputedBy = originalDispute.to;
    const ratedBy = originalDispute.from;
    const systemUser = originalDispute.from;

    // Create notifications for both parties
    const newNotifications = [
      // For the person who disputed
      new Notification({
        to: disputedBy,
        from: systemUser,
        type: action === 'approve' ? 'dispute_approved' : 'dispute_rejected',
        message: resolutionMessage,
        data: {
          disputeId,
          disputeDetails: {
            ...disputeDetails,
            id: disputeId,
            status: newStatus,
            updatedAt: new Date(),
            categories: originalCategories,
            ratings: originalRatings,
            reason: disputeDetails.reason,
            reasonType: disputeDetails.reasonType,
            disputerName: disputeDetails.disputerName,
            raterName: disputeDetails.raterName
          },
          originalDispute: disputeDetails
        }
      }),
      // For the person who gave the rating
      new Notification({
        to: ratedBy,
        from: systemUser,
        type: action === 'approve' ? 'dispute_approved' : 'dispute_rejected',
        message: action === 'approve'
          ? 'A dispute against your rating has been approved. The rating will be removed.'
          : 'A dispute against your rating has been rejected. The rating will remain.',
        data: {
          disputeId,
          disputeDetails: {
            ...disputeDetails,
            id: disputeId,
            status: newStatus,
            updatedAt: new Date(),
            categories: originalCategories,
            ratings: originalRatings,
            reason: disputeDetails.reason,
            reasonType: disputeDetails.reasonType,
            disputerName: disputeDetails.disputerName,
            raterName: disputeDetails.raterName
          },
          originalDispute: disputeDetails
        }
      })
    ];

    await Promise.all(newNotifications.map(n => n.save()));
    console.log(' [DisputeAction] Created resolution notifications');

    // Update original dispute notification status
    originalDispute.data.disputeDetails.status = action === 'approve' ? 'resolved' : 'rejected';
    originalDispute.data.disputeDetails.updatedAt = new Date();
    await originalDispute.save();

    res.status(200).json({ 
      success: true,
      message: `Dispute ${action}ed successfully`,
      notifications: newNotifications
    });

  } catch (error) {
    console.error('[disputeAction] Error:', error);
    next(errorHandler(500, error.message || 'Error updating dispute status'));
  }
};
