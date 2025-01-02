import AnalyticsModel from "../models/analytics.model.js";
import mongoose from "mongoose";

// Track analytics events (views, clicks, inquiries)
export const trackAnalyticsEvent = async (req, res) => {
  const userId = req.params.id;
  const { eventType, listingId } = req.body;

  try {
    console.log('Tracking event:', { userId, eventType, listingId });

    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(listingId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID or listing ID"
      });
    }

    let analytics = await AnalyticsModel.findOne({ userId: userId });
    console.log('Found existing analytics:', analytics ? 'yes' : 'no');

    if (!analytics) {
      analytics = new AnalyticsModel({
        userId,
        clicks: 0,
        views: 0,
        listingsCount: 0,
        listingAnalytics: []
      });
      console.log('Created new analytics document');
    }

    // Update overall analytics
    if (eventType === 'view') analytics.views += 1;
    if (eventType === 'click') analytics.clicks += 1;

    // Find or create listing analytics
    let listingStats = analytics.listingAnalytics.find(
      la => la.listingId.toString() === listingId
    );

    if (!listingStats) {
      listingStats = {
        listingId: new mongoose.Types.ObjectId(listingId),
        views: 0,
        clicks: 0,
        inquiries: 0,
        lastUpdated: new Date()
      };
      analytics.listingAnalytics.push(listingStats);
      console.log('Created new listing analytics');
    }

    // Update listing-specific metrics
    if (eventType === 'view') listingStats.views += 1;
    if (eventType === 'click') listingStats.clicks += 1;
    if (eventType === 'inquiry') listingStats.inquiries += 1;

    // Update timestamps
    analytics.lastUpdated = new Date();
    listingStats.lastUpdated = new Date();

    console.log('Saving analytics with updated stats:', {
      overall: { views: analytics.views, clicks: analytics.clicks },
      listing: { 
        id: listingStats.listingId,
        views: listingStats.views, 
        clicks: listingStats.clicks,
        inquiries: listingStats.inquiries
      }
    });

    await analytics.save();

    res.status(200).json({
      success: true,
      message: 'Analytics updated successfully'
    });
  } catch (error) {
    console.error("Error tracking analytics:", error);
    res.status(500).json({
      success: false,
      message: "Error tracking analytics"
    });
  }
};

// Fetch listing-specific analytics
export const getListingAnalytics = async (req, res) => {
  const listingId = req.params.id;

  try {
    console.log('Fetching analytics for listing:', listingId);

    if (!mongoose.Types.ObjectId.isValid(listingId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid listing ID"
      });
    }

    // Use aggregation to find the listing analytics
    const result = await AnalyticsModel.aggregate([
      {
        $match: {
          'listingAnalytics.listingId': new mongoose.Types.ObjectId(listingId)
        }
      },
      {
        $unwind: '$listingAnalytics'
      },
      {
        $match: {
          'listingAnalytics.listingId': new mongoose.Types.ObjectId(listingId)
        }
      },
      {
        $group: {
          _id: '$listingAnalytics.listingId',
          views: { $sum: '$listingAnalytics.views' },
          clicks: { $sum: '$listingAnalytics.clicks' },
          inquiries: { $sum: '$listingAnalytics.inquiries' }
        }
      }
    ]);

    console.log('Aggregation result:', result);

    if (!result || result.length === 0) {
      return res.status(200).json({
        success: true,
        views: 0,
        clicks: 0,
        inquiries: 0
      });
    }

    const stats = result[0];
    console.log('Returning stats:', stats);

    res.status(200).json({
      success: true,
      views: stats.views || 0,
      clicks: stats.clicks || 0,
      inquiries: stats.inquiries || 0
    });
  } catch (error) {
    console.error("Error fetching listing analytics:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching listing analytics"
    });
  }
};

// Fetch user analytics
export const getUserAnalytics = async (req, res) => {
  const userId = req.params.id;

  try {
    console.log('Fetching analytics for user:', userId);

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID"
      });
    }

    const analytics = await AnalyticsModel.findOne({ userId });
    console.log('Found analytics:', analytics ? 'yes' : 'no');

    if (!analytics) {
      return res.status(200).json({
        success: true,
        clicks: 0,
        views: 0,
        listingsCount: 0,
        averageViewsPerListing: 0
      });
    }

    const response = {
      success: true,
      clicks: analytics.clicks || 0,
      views: analytics.views || 0,
      listingsCount: analytics.listingsCount || 0,
      averageViewsPerListing: analytics.listingsCount > 0 
        ? Math.round((analytics.views / analytics.listingsCount) * 100) / 100
        : 0
    };

    console.log('Returning user analytics:', response);

    res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching analytics:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching analytics"
    });
  }
};
