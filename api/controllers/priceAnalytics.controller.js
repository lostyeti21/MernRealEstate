import Listing from '../models/listing.model.js';
import { errorHandler } from '../utils/error.js';

// Get price analytics for a listing
export const getListingPriceAnalytics = async (req, res, next) => {
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

    // Find similar listings in the area
    const similarListings = await Listing.find({
      _id: { $ne: listingId },
      type: listing.type,
      bedrooms: { 
        $gte: listing.bedrooms - 1, 
        $lte: listing.bedrooms + 1 
      },
      bathrooms: { 
        $gte: listing.bathrooms - 1, 
        $lte: listing.bathrooms + 1 
      }
    }).select('regularPrice discountPrice type bedrooms bathrooms');

    // Calculate price statistics
    const prices = similarListings.map(l => 
      l.discountPrice || l.regularPrice
    );

    const stats = {
      count: prices.length,
      min: Math.min(...prices, listing.discountPrice || listing.regularPrice),
      max: Math.max(...prices, listing.discountPrice || listing.regularPrice),
      avg: prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : 0
    };

    // Calculate where this listing stands
    const currentPrice = listing.discountPrice || listing.regularPrice;
    const percentileRank = prices.filter(p => p < currentPrice).length / prices.length * 100;

    // Market position analysis
    let marketPosition;
    if (percentileRank < 25) {
      marketPosition = 'Below Market';
    } else if (percentileRank > 75) {
      marketPosition = 'Above Market';
    } else {
      marketPosition = 'Market Average';
    }

    // Price recommendations
    const recommendedRange = {
      min: Math.round(stats.avg * 0.9),
      max: Math.round(stats.avg * 1.1)
    };

    res.status(200).json({
      success: true,
      currentPrice,
      similarListings: similarListings.length,
      priceStats: stats,
      percentileRank,
      marketPosition,
      recommendedRange,
      details: {
        type: listing.type,
        bedrooms: listing.bedrooms,
        bathrooms: listing.bathrooms
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get aggregated price analytics for all user listings
export const getUserPriceAnalytics = async (req, res, next) => {
  try {
    const { userId } = req.params;

    // Verify user is requesting their own analytics
    if (userId !== req.user.id) {
      return next(errorHandler(403, 'You can only view your own analytics'));
    }

    // Get all user listings
    const userListings = await Listing.find({ userRef: userId });
    const listingAnalytics = await Promise.all(
      userListings.map(async (listing) => {
        const similarListings = await Listing.find({
          _id: { $ne: listing._id },
          type: listing.type,
          bedrooms: { 
            $gte: listing.bedrooms - 1, 
            $lte: listing.bedrooms + 1 
          },
          bathrooms: { 
            $gte: listing.bathrooms - 1, 
            $lte: listing.bathrooms + 1 
          }
        }).select('regularPrice discountPrice');

        const prices = similarListings.map(l => 
          l.discountPrice || l.regularPrice
        );

        const currentPrice = listing.discountPrice || listing.regularPrice;
        const avgPrice = prices.length ? 
          prices.reduce((a, b) => a + b, 0) / prices.length : 
          currentPrice;

        const percentDiff = ((currentPrice - avgPrice) / avgPrice) * 100;

        return {
          listingId: listing._id,
          name: listing.name,
          currentPrice,
          avgMarketPrice: Math.round(avgPrice),
          percentDiff: Math.round(percentDiff),
          competitiveness: 
            percentDiff < -10 ? 'Below Market' :
            percentDiff > 10 ? 'Above Market' :
            'Market Average'
        };
      })
    );

    res.status(200).json({
      success: true,
      listings: listingAnalytics
    });
  } catch (error) {
    next(error);
  }
};
