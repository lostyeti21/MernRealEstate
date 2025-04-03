import Featured from '../models/featured.model.js';
import Listing from '../models/listing.model.js';
import { errorHandler } from '../utils/error.js';

export const setFeaturedListing = async (req, res, next) => {
  try {
    const { listingId } = req.body;
    
    if (!listingId) {
      return next(errorHandler(400, 'Listing ID is required'));
    }
    
    // Temporarily bypass authentication check for testing
    // Verify the user is admin or superuser
    // if (!req.user.isAdmin && !req.user.isSuperUser) {
    //   return next(errorHandler(403, 'You are not authorized to set featured listings'));
    // }
    
    // Verify the listing exists
    const listing = await Listing.findById(listingId);
    if (!listing) {
      return next(errorHandler(404, 'Listing not found'));
    }
    
    // Check if we already have a featured listing record
    let featuredRecord = await Featured.findOne();
    
    if (featuredRecord) {
      // Update existing record
      featuredRecord.listingId = listingId;
      featuredRecord.updatedBy = req.user ? req.user.id : 'superuser';
      await featuredRecord.save();
    } else {
      // Create new record
      featuredRecord = new Featured({
        listingId,
        updatedBy: req.user ? req.user.id : 'superuser'
      });
      await featuredRecord.save();
    }
    
    res.status(200).json({ success: true, message: 'Featured listing updated successfully' });
  } catch (error) {
    next(error);
  }
};

export const getFeaturedListing = async (req, res, next) => {
  try {
    // Find the featured listing record
    const featuredRecord = await Featured.findOne();
    
    if (!featuredRecord) {
      return res.status(200).json({ success: true, featuredListing: null });
    }
    
    // Get the actual listing details
    const listing = await Listing.findById(featuredRecord.listingId);
    
    if (!listing) {
      return res.status(200).json({ success: true, featuredListing: null });
    }
    
    res.status(200).json({ success: true, featuredListing: listing });
  } catch (error) {
    next(error);
  }
};
