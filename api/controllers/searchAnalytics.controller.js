import SearchAnalytics from '../models/searchAnalytics.model.js';
import Listing from '../models/listing.model.js';
import { errorHandler } from '../utils/error.js';

// Record a search term that led to a listing
export const recordSearch = async (req, res, next) => {
  try {
    const { listingId } = req.params;
    const { searchTerm, filters } = req.body;

    if (!searchTerm) {
      return next(errorHandler(400, 'Search term is required'));
    }

    const listing = await Listing.findById(listingId);
    if (!listing) {
      return next(errorHandler(404, 'Listing not found'));
    }

    // Create a formatted search term that includes filters
    let formattedSearchTerm = searchTerm.toLowerCase();
    if (filters) {
      const activeFilters = [];
      if (filters.type && filters.type !== 'all') activeFilters.push(filters.type);
      if (filters.parking) activeFilters.push('parking');
      if (filters.furnished) activeFilters.push('furnished');
      if (filters.offer) activeFilters.push('offer');
      
      if (activeFilters.length > 0) {
        formattedSearchTerm += ` (${activeFilters.join(', ')})`;
      }
    }

    // Update or create search analytics
    const searchAnalytics = await SearchAnalytics.findOneAndUpdate(
      {
        listingId,
        userId: listing.userRef,
        searchTerm: formattedSearchTerm
      },
      {
        $inc: { count: 1 },
        lastSearched: new Date()
      },
      {
        upsert: true,
        new: true
      }
    );

    res.status(200).json({ success: true, searchAnalytics });
  } catch (error) {
    next(error);
  }
};

// Get search analytics for a specific listing
export const getListingSearchAnalytics = async (req, res, next) => {
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

    const searchAnalytics = await SearchAnalytics.find({ listingId })
      .sort({ count: -1, lastSearched: -1 })
      .limit(20);

    const formattedAnalytics = searchAnalytics.map(item => ({
      term: item.searchTerm,
      count: item.count,
      lastSearched: item.lastSearched
    }));

    res.status(200).json({
      success: true,
      searchTerms: formattedAnalytics
    });
  } catch (error) {
    next(error);
  }
};

// Get aggregated search analytics for all user listings
export const getUserSearchAnalytics = async (req, res, next) => {
  try {
    const { userId } = req.params;

    // Verify user is requesting their own analytics
    if (userId !== req.user.id) {
      return next(errorHandler(403, 'You can only view your own analytics'));
    }

    // Get all listings for user
    const userListings = await Listing.find({ userRef: userId });
    const listingIds = userListings.map(listing => listing._id);

    // Aggregate search terms across all listings
    const searchAnalytics = await SearchAnalytics.aggregate([
      {
        $match: {
          listingId: { $in: listingIds }
        }
      },
      {
        $group: {
          _id: '$searchTerm',
          totalCount: { $sum: '$count' },
          lastSearched: { $max: '$lastSearched' },
          listings: { $addToSet: '$listingId' }
        }
      },
      {
        $sort: {
          totalCount: -1,
          lastSearched: -1
        }
      },
      {
        $limit: 20
      }
    ]);

    const formattedAnalytics = searchAnalytics.map(item => ({
      term: item._id,
      count: item.totalCount,
      lastSearched: item.lastSearched,
      listingCount: item.listings.length
    }));

    res.status(200).json({
      success: true,
      searchTerms: formattedAnalytics
    });
  } catch (error) {
    next(error);
  }
};
