import CTRAnalytics from '../models/ctrAnalytics.model.js';
import Listing from '../models/listing.model.js';
import { errorHandler } from '../utils/error.js';

// Record an impression
export const recordImpression = async (req, res, next) => {
  try {
    const { listingId } = req.params;
    const { source = 'direct' } = req.body;

    const listing = await Listing.findById(listingId);
    if (!listing) {
      return next(errorHandler(404, 'Listing not found'));
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Update or create CTR analytics
    const ctrAnalytics = await CTRAnalytics.findOneAndUpdate(
      { listingId, userId: listing.userRef },
      {
        $inc: { 
          impressions: 1,
          'sources.$[source].impressions': 1
        },
        $setOnInsert: {
          dailyStats: [{
            date: today,
            impressions: 1,
            clicks: 0
          }]
        },
        lastUpdated: new Date()
      },
      {
        arrayFilters: [{ 'source.name': source }],
        upsert: true,
        new: true
      }
    );

    // Update daily stats
    await CTRAnalytics.updateOne(
      { 
        _id: ctrAnalytics._id,
        'dailyStats.date': today
      },
      {
        $inc: { 'dailyStats.$.impressions': 1 }
      }
    );

    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};

// Record a click
export const recordClick = async (req, res, next) => {
  try {
    const { listingId } = req.params;
    const { source = 'direct' } = req.body;

    const listing = await Listing.findById(listingId);
    if (!listing) {
      return next(errorHandler(404, 'Listing not found'));
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Update or create CTR analytics
    const ctrAnalytics = await CTRAnalytics.findOneAndUpdate(
      { listingId, userId: listing.userRef },
      {
        $inc: { 
          clicks: 1,
          'sources.$[source].clicks': 1
        },
        lastUpdated: new Date()
      },
      {
        arrayFilters: [{ 'source.name': source }],
        new: true
      }
    );

    // Update daily stats
    await CTRAnalytics.updateOne(
      { 
        _id: ctrAnalytics._id,
        'dailyStats.date': today
      },
      {
        $inc: { 'dailyStats.$.clicks': 1 }
      }
    );

    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};

// Get CTR analytics for a specific listing
export const getListingCTRAnalytics = async (req, res, next) => {
  try {
    const { listingId } = req.params;
    
    const listing = await Listing.findById(listingId);
    if (!listing) {
      return next(errorHandler(404, 'Listing not found'));
    }

    // Verify user owns the listing
    if (listing.userRef.toString() !== req.user.id) {
      return next(errorHandler(403, 'You can only view analytics for your own listings'));
    }

    const ctrAnalytics = await CTRAnalytics.findOne({ listingId });
    if (!ctrAnalytics) {
      return res.status(200).json({
        success: true,
        stats: {
          impressions: 0,
          clicks: 0,
          ctr: 0,
          sources: [],
          dailyStats: []
        }
      });
    }

    // Calculate CTR for each source
    const sourcesWithCTR = ctrAnalytics.sources.map(source => ({
      name: source.name,
      impressions: source.impressions,
      clicks: source.clicks,
      ctr: source.impressions > 0 ? (source.clicks / source.impressions * 100).toFixed(2) : 0
    }));

    // Calculate overall CTR
    const overallCTR = ctrAnalytics.impressions > 0 
      ? (ctrAnalytics.clicks / ctrAnalytics.impressions * 100).toFixed(2)
      : 0;

    res.status(200).json({
      success: true,
      stats: {
        impressions: ctrAnalytics.impressions,
        clicks: ctrAnalytics.clicks,
        ctr: overallCTR,
        sources: sourcesWithCTR,
        dailyStats: ctrAnalytics.dailyStats
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get aggregated CTR analytics for all user listings
export const getUserCTRAnalytics = async (req, res, next) => {
  try {
    const { userId } = req.params;

    // Verify user is requesting their own analytics
    if (userId !== req.user.id) {
      return next(errorHandler(403, 'You can only view your own analytics'));
    }

    // Get all user listings
    const userListings = await Listing.find({ userRef: userId });
    const listingIds = userListings.map(listing => listing._id);

    // Get CTR analytics for all listings
    const ctrAnalytics = await CTRAnalytics.find({
      listingId: { $in: listingIds }
    }).populate('listingId', 'name');

    // Format analytics for each listing
    const listingAnalytics = ctrAnalytics.length > 0 
      ? ctrAnalytics.map(analytics => {
          const listing = userListings.find(l => l._id.toString() === analytics.listingId.toString());
          
          // Fallback if listing not found
          if (!listing) {
            console.warn(`Listing not found for CTR analytics: ${analytics.listingId}`);
            return null;
          }

          return {
            listingId: analytics.listingId,
            name: listing.name,
            impressions: analytics.impressions || 0,
            clicks: analytics.clicks || 0,
            ctr: analytics.impressions > 0 
              ? (analytics.clicks / analytics.impressions * 100).toFixed(2)
              : 0,
            sources: (analytics.sources || []).map(source => ({
              name: source.name,
              impressions: source.impressions || 0,
              clicks: source.clicks || 0,
              ctr: source.impressions > 0 
                ? (source.clicks / source.impressions * 100).toFixed(2)
                : 0
            }))
          };
        }).filter(item => item !== null)
      : [];

    // If no CTR analytics found, create an empty array
    res.status(200).json({
      success: true,
      listings: listingAnalytics
    });
  } catch (error) {
    console.error('Error in getUserCTRAnalytics:', error);
    next(error);
  }
};
