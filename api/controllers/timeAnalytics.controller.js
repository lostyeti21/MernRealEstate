import TimeAnalytics from '../models/timeAnalytics.model.js';
import Listing from '../models/listing.model.js';
import { errorHandler } from '../utils/error.js';

// Record a view at the current hour
export const recordView = async (req, res, next) => {
  try {
    const { listingId } = req.params;
    const currentHour = new Date().getHours();
    
    const listing = await Listing.findById(listingId);
    if (!listing) {
      return next(errorHandler(404, 'Listing not found'));
    }

    let timeAnalytics = await TimeAnalytics.findOne({
      listingId,
      userId: listing.userRef
    });

    if (!timeAnalytics) {
      timeAnalytics = new TimeAnalytics({
        listingId,
        userId: listing.userRef,
        hourlyViews: Array(24).fill(0)
      });
    }

    // Increment view count for current hour
    timeAnalytics.hourlyViews[currentHour]++;
    timeAnalytics.lastUpdated = new Date();
    await timeAnalytics.save();

    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};

// Get time analytics for a specific listing
export const getListingTimeAnalytics = async (req, res, next) => {
  try {
    const { listingId } = req.params;
    console.log('Fetching time analytics for listing:', listingId);
    console.log('User:', req.user);
    
    const listing = await Listing.findById(listingId);
    if (!listing) {
      console.log('Listing not found');
      return next(errorHandler(404, 'Listing not found'));
    }

    // Verify user owns the listing
    if (listing.userRef.toString() !== req.user.id) {
      console.log('User not authorized');
      return next(errorHandler(403, 'You can only view analytics for your own listings'));
    }

    const timeAnalytics = await TimeAnalytics.findOne({ listingId });
    console.log('Time analytics found:', timeAnalytics);
    
    res.status(200).json({
      success: true,
      hourlyViews: timeAnalytics ? timeAnalytics.hourlyViews : Array(24).fill(0)
    });
  } catch (error) {
    console.error('Error in getListingTimeAnalytics:', error);
    next(error);
  }
};

// Get aggregated time analytics for all user listings
export const getUserTimeAnalytics = async (req, res, next) => {
  try {
    const { userId } = req.params;
    console.log('Fetching time analytics for user:', userId);
    console.log('Authenticated user:', req.user);

    // Verify user is requesting their own analytics
    if (userId !== req.user.id) {
      console.log('User not authorized');
      return next(errorHandler(403, 'You can only view your own analytics'));
    }

    // Get all listings for user
    const userListings = await Listing.find({ userRef: userId });
    console.log('Found listings:', userListings.length);
    const listingIds = userListings.map(listing => listing._id);

    // Get time analytics for all listings
    const timeAnalytics = await TimeAnalytics.find({
      listingId: { $in: listingIds }
    });
    console.log('Found time analytics:', timeAnalytics.length);

    // Aggregate hourly views across all listings
    const aggregatedViews = Array(24).fill(0);
    timeAnalytics.forEach(analytics => {
      analytics.hourlyViews.forEach((views, hour) => {
        aggregatedViews[hour] += views;
      });
    });

    res.status(200).json({
      success: true,
      hourlyViews: aggregatedViews
    });
  } catch (error) {
    console.error('Error in getUserTimeAnalytics:', error);
    next(error);
  }
};

// Reset time analytics for testing/admin purposes
export const resetTimeAnalytics = async (req, res, next) => {
  try {
    const { listingId } = req.params;
    
    const listing = await Listing.findById(listingId);
    if (!listing) {
      return next(errorHandler(404, 'Listing not found'));
    }

    // Verify user owns the listing
    if (listing.userRef.toString() !== req.user.id) {
      return next(errorHandler(403, 'You can only reset analytics for your own listings'));
    }

    await TimeAnalytics.findOneAndUpdate(
      { listingId },
      { hourlyViews: Array(24).fill(0) },
      { new: true }
    );

    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};
