import AnalyticsModel from "../models/analytics.model.js";

// Fetch user analytics
export const getUserAnalytics = async (req, res) => {
  const userId = req.params.id;

  try {
    // Fetch analytics data from the database
    const analytics = await AnalyticsModel.findOne({ userId });

    if (!analytics) {
      // Initialize default analytics if not found
      const newAnalytics = new AnalyticsModel({
        userId: userId,
        clicks: 0,
        views: 0,
        listingsCount: 0,
      });
      await newAnalytics.save();

      return res.status(200).json({
        success: true,
        clicks: 0,
        views: 0,
        listingsCount: 0,
        averageViewsPerListing: 0,
        message: "Initialized analytics for this user.",
      });
    }

    res.status(200).json({
      success: true,
      clicks: analytics.clicks,
      views: analytics.views,
      listingsCount: analytics.listingsCount,
      averageViewsPerListing:
        analytics.listingsCount > 0
          ? analytics.views / analytics.listingsCount
          : 0,
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// Increment views for a user
export const incrementViews = async (userId) => {
  try {
    const analytics = await AnalyticsModel.findOne({ userId });
    if (analytics) {
      analytics.views += 1;
      await analytics.save();
    } else {
      console.error(`Analytics not found for user: ${userId}`);
    }
  } catch (error) {
    console.error("Error incrementing views:", error);
  }
};

// Increment clicks for a user
export const incrementClicks = async (userId) => {
  try {
    const analytics = await AnalyticsModel.findOne({ userId });
    if (analytics) {
      analytics.clicks += 1;
      await analytics.save();
    } else {
      console.error(`Analytics not found for user: ${userId}`);
    }
  } catch (error) {
    console.error("Error incrementing clicks:", error);
  }
};
