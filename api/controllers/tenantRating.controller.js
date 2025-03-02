import TenantRating from '../models/tenantRating.model.js';
import User from '../models/user.model.js';
import { errorHandler } from '../utils/error.js';
import mongoose from 'mongoose';

// Rate a tenant
export const rateTenant = async (req, res, next) => {
  try {
    const { tenantId } = req.params;
    const { ratings } = req.body;
    const userId = req.user.id;

    // Validate tenant ID
    if (!mongoose.Types.ObjectId.isValid(tenantId)) {
      return next(errorHandler(400, 'Invalid tenant ID'));
    }

    // Verify tenant exists
    const tenant = await User.findById(tenantId);
    if (!tenant) {
      return next(errorHandler(404, 'Tenant not found'));
    }

    // Create ratings for each category
    const ratingPromises = ratings.map(rating => 
      TenantRating.create({
        tenant: tenantId,
        ratedBy: userId,
        ratedUser: tenantId,
        category: rating.category,
        value: rating.value,
        comment: rating.comment || ''
      })
    );

    await Promise.all(ratingPromises);

    // Calculate new average ratings
    const updatedRatings = await TenantRating.calculateAverageRating(tenantId);

    // Get rater's name for the notification
    const user = await User.findById(userId).select('username');
    const raterName = user ? user.username : 'A user';

    res.status(200).json({
      success: true,
      message: 'Rating submitted successfully',
      ratings: updatedRatings,
      raterName
    });

  } catch (error) {
    console.error('Error in rateTenant:', error);
    next(errorHandler(500, error.message || 'Error submitting tenant rating'));
  }
};

// Get tenant ratings
export const getTenantRatings = async (req, res, next) => {
  try {
    const { tenantId } = req.params;

    // Validate tenant ID
    if (!mongoose.Types.ObjectId.isValid(tenantId)) {
      return next(errorHandler(400, 'Invalid tenant ID'));
    }

    const ratings = await TenantRating.calculateAverageRating(tenantId);

    res.status(200).json({
      success: true,
      ratings
    });

  } catch (error) {
    console.error('Error in getTenantRatings:', error);
    next(errorHandler(500, 'Error fetching tenant ratings'));
  }
};

// Check if user has rated a tenant
export const checkIfRated = async (req, res, next) => {
  try {
    const { tenantId } = req.params;
    const userId = req.user.id;

    const hasRated = await TenantRating.hasUserRatedTenant(tenantId, userId);

    res.status(200).json({
      success: true,
      hasRated
    });

  } catch (error) {
    console.error('Error in checkIfRated:', error);
    next(errorHandler(500, 'Error checking rating status'));
  }
};

// Get rating by category
export const getRatingByCategory = async (req, res, next) => {
  try {
    const { tenantId, category } = req.params;

    // Validate tenant ID
    if (!mongoose.Types.ObjectId.isValid(tenantId)) {
      return next(errorHandler(400, 'Invalid tenant ID'));
    }

    // Find the most recent rating for this category
    const rating = await TenantRating.findOne({
      tenant: tenantId,
      category: category.toLowerCase()
    }).sort({ createdAt: -1 });

    if (!rating) {
      return next(errorHandler(404, `No rating found for category ${category}`));
    }

    res.status(200).json({
      success: true,
      rating
    });

  } catch (error) {
    console.error('Error in getRatingByCategory:', error);
    next(errorHandler(500, 'Error fetching rating by category'));
  }
};
