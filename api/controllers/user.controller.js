import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/user.model.js";
import Listing from "../models/listing.model.js";
import { errorHandler } from "../utils/error.js";

// Helper function to create consistent error responses
const createErrorResponse = (statusCode, message, error) => ({ statusCode, message, error });

// Utility function to calculate average rating
const calculateAverageRating = (ratings) => {
  try {
    // Validate input
    if (!ratings || !Array.isArray(ratings) || ratings.length === 0) {
      console.log('No ratings provided or invalid ratings array');
      return 0;
    }

    // Log raw ratings for debugging
    console.log('Raw Ratings:', ratings);

    // Validate rating structure
    const validRatings = ratings.filter(rating => 
      rating && typeof rating.value === 'number'
    );

    if (validRatings.length === 0) {
      console.log('No valid ratings found');
      return 0;
    }

    // Calculate average
    const totalRating = validRatings.reduce((sum, rating) => sum + rating.value, 0);
    const averageRating = totalRating / validRatings.length;

    console.log(`Average Rating Calculation:
      Total Rating: ${totalRating}
      Valid Ratings Count: ${validRatings.length}
      Average: ${averageRating}`);

    return averageRating;
  } catch (error) {
    console.error('Error in calculateAverageRating:', error);
    return 0;
  }
};

export const updateUser = async (req, res, next) => {
  if (req.user.id !== req.params.id) {
    return next(createErrorResponse(401, "You can only update your own account!"));
  }

  try {
    if (req.body.password) {
      req.body.password = bcrypt.hashSync(req.body.password, 10);
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );

    if (!updatedUser) {
      return next(createErrorResponse(404, "User not found."));
    }

    const { password, ...rest } = updatedUser._doc;
    res.status(200).json(rest);
  } catch (error) {
    console.error("Error updating user:", error);
    next(createErrorResponse(500, "An error occurred while updating the user."));
  }
};

export const deleteUser = async (req, res, next) => {
  if (req.user.id !== req.params.id) {
    return next(createErrorResponse(401, "You can only delete your own account!"));
  }

  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);
    if (!deletedUser) {
      return next(createErrorResponse(404, "User not found."));
    }

    res.clearCookie("access_token");
    res.status(200).json({ message: "User has been deleted." });
  } catch (error) {
    console.error("Error deleting user:", error);
    next(createErrorResponse(500, "An error occurred while deleting the user."));
  }
};

export const superUserDeleteUser = async (req, res, next) => {
  try {
    const userId = req.params.id;
    const deletedUser = await User.findByIdAndDelete(userId);
    
    if (!deletedUser) {
      return next(createErrorResponse(404, "User not found."));
    }

    res.status(200).json({ message: "User has been deleted." });
  } catch (error) {
    console.error("Error deleting user:", error);
    next(createErrorResponse(500, "An error occurred while deleting the user."));
  }
};

export const getListingById = async (req, res, next) => {
  try {
    const listingId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(listingId)) {
      return next(createErrorResponse(400, "Invalid listing ID."));
    }

    const listing = await Listing.findById(listingId).populate("userRef", "username avatar phoneNumbers ratings ratedBy");
    
    if (!listing) {
      return next(createErrorResponse(404, "Listing not found."));
    }

    res.status(200).json(listing);
  } catch (error) {
    console.error("Error fetching listing:", error);
    next(createErrorResponse(500, "An error occurred while fetching the listing."));
  }
};

export const getUserListings = async (req, res, next) => {
  try {
    const userId = req.params.id;
    
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID"
      });
    }

    // Find the user and their listings
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const listings = await Listing.find({ userRef: userId });
    console.log('Found listings:', listings);

    return res.status(200).json({
      success: true,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email
      },
      listings: listings || []
    });

  } catch (error) {
    console.error('Error getting user listings:', error);
    return res.status(500).json({
      success: false,
      message: "Error fetching listings"
    });
  }
};

export const getUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(createErrorResponse(400, "Invalid user ID."));
    }

    const user = await User.findById(id);
    if (!user) {
      return next(createErrorResponse(404, "User not found."));
    }

    // Get rating details using the model method
    const ratingDetails = user.getRatingDetails();

    res.status(200).json({
      _id: user._id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      phoneNumbers: user.phoneNumbers,
      ratings: {
        overall: {
          averageRating: ratingDetails.overall.averageRating,
          totalRatings: ratingDetails.overall.totalRatings
        },
        categories: ratingDetails.categories
      }
    });
  } catch (error) {
    console.error("Error getting user:", error);
    next(createErrorResponse(500, "An error occurred while fetching user details."));
  }
};

export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Get rating details using the method we created in the model
    const ratingDetails = user.getRatingDetails();

    // Prepare response with user details and ratings
    const userProfile = {
      _id: user._id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      phoneNumbers: user.phoneNumbers,
      ratings: ratingDetails
    };

    res.status(200).json(userProfile);

  } catch (error) {
    console.error('Error in getUserProfile:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });

    res.status(500).json({ 
      success: false, 
      message: 'Error retrieving user profile',
      error: error.message 
    });
  }
};

export const rateLandlord = async (req, res, next) => {
  try {
    console.log('Rate Landlord Debug');
    console.log('  Request Body:', req.body);
    console.log('  Authenticated User ID:', req.user.id);

    const { landlordId, ratings } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!landlordId || !ratings || !Array.isArray(ratings)) {
      return next(errorHandler(400, 'Invalid request data'));
    }

    // Find the landlord
    const landlord = await User.findById(landlordId);
    if (!landlord) {
      return next(errorHandler(404, 'Landlord not found'));
    }

    // Check if user is trying to rate themselves
    if (landlord._id.toString() === userId) {
      return next(errorHandler(400, 'You cannot rate yourself'));
    }

    // Check if user has already rated this landlord
    const hasRated = landlord.ratedBy && landlord.ratedBy.some(id => id.toString() === userId);
    if (hasRated) {
      return next(errorHandler(400, 'You have already rated this landlord'));
    }

    // Category mapping for normalization
    const categoryMap = {
      'responsetime': 'responseTime',
      'maintenance': 'maintenance',
      'experience': 'experience'
    };

    // Validate and normalize ratings
    const validCategories = ['responseTime', 'maintenance', 'experience'];
    const newRatings = ratings.map(rating => {
      // Normalize category name
      const normalizedCategory = categoryMap[rating.category.toLowerCase()] || rating.category;
      
      // Validate category
      if (!validCategories.includes(normalizedCategory)) {
        throw new Error(`Invalid category: ${rating.category}`);
      }

      // Validate rating value
      const ratingValue = Number(rating.value);
      if (isNaN(ratingValue) || ratingValue < 1 || ratingValue > 5) {
        throw new Error(`Invalid rating value for ${normalizedCategory}: ${rating.value}`);
      }

      return {
        value: ratingValue,
        category: normalizedCategory,
        comment: rating.comment || '',
        ratedBy: new mongoose.Types.ObjectId(userId),
        createdAt: new Date()
      };
    });

    // Initialize arrays if they don't exist
    if (!Array.isArray(landlord.ratings)) {
      landlord.ratings = [];
    }
    if (!Array.isArray(landlord.ratedBy)) {
      landlord.ratedBy = [];
    }

    // Add new ratings and update ratedBy array
    landlord.ratings.push(...newRatings);
    landlord.ratedBy.push(new mongoose.Types.ObjectId(userId));

    // Calculate overall rating
    const categoryTotals = {};
    validCategories.forEach(category => {
      const categoryRatings = landlord.ratings.filter(r => r.category === category);
      if (categoryRatings.length > 0) {
        categoryTotals[category] = categoryRatings.reduce((sum, r) => sum + r.value, 0) / categoryRatings.length;
      }
    });

    // Save the updated landlord
    await landlord.save();

    // Get updated rating details
    const ratingDetails = landlord.getRatingDetails();

    console.log('Successfully saved ratings:', {
      landlordId,
      newRatings,
      ratingDetails
    });

    res.status(200).json({
      success: true,
      message: 'Rating submitted successfully',
      ratings: ratingDetails
    });

  } catch (error) {
    console.error('Rating Submission Error:', error);
    next(errorHandler(500, error.message || 'An error occurred while submitting the rating.'));
  }
};

export const rateTenant = async (req, res, next) => {
  const { tenantId, maintenance, behavior, payments } = req.body;

  const ratings = [maintenance, behavior, payments];
  if (ratings.some((rating) => rating < 1 || rating > 5)) {
    return next(createErrorResponse(400, "Each rating must be between 1 and 5."));
  }

  try {
    const isLandlord = await Listing.exists({ userRef: req.user.id });
    if (!isLandlord) {
      return next(createErrorResponse(403, "Only landlords can rate tenants."));
    }

    const tenant = await User.findById(tenantId);
    if (!tenant) return next(createErrorResponse(404, "Tenant not found."));
    if (tenant.ratedBy.includes(req.user.id)) {
      return next(createErrorResponse(403, "You have already rated this tenant."));
    }

    const newRating = (maintenance + behavior + payments) / 3;
    tenant.ratings.push(newRating);
    tenant.ratedBy.push(req.user.id);

    tenant.updateAverageRating();
    await tenant.save();

    res.status(200).json({
      message: "Rating submitted successfully!",
      averageRating: tenant.averageRating,
    });
  } catch (error) {
    console.error("Error rating tenant:", error);
    next(createErrorResponse(500, "An error occurred while submitting the rating."));
  }
};

export const checkIfRated = async (req, res, next) => {
  try {
    const { landlordId } = req.params;
    const userId = req.user.id;

    // Validate landlordId
    if (!mongoose.Types.ObjectId.isValid(landlordId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid landlord ID"
      });
    }

    // Find the landlord
    const landlord = await User.findById(landlordId);
    if (!landlord) {
      return res.status(404).json({
        success: false,
        message: "Landlord not found"
      });
    }

    // Check if user has already rated
    const hasRated = Array.isArray(landlord.ratedBy) && 
      landlord.ratedBy.some(id => id.toString() === userId);

    return res.status(200).json({
      success: true,
      hasRated,
      message: hasRated ? "You have already rated this landlord" : "You can rate this landlord"
    });

  } catch (error) {
    console.error("Error checking if rated:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while checking if rated"
    });
  }
};

export const getLandlords = async (req, res, next) => {
  try {
    console.log('Getting landlords with query:', req.query);
    
    const limit = parseInt(req.query.limit) || 9;
    const startIndex = parseInt(req.query.startIndex) || 0;
    const searchTerm = req.query.searchTerm || '';
    const sort = req.query.sort || 'createdAt';
    const order = req.query.order || 'desc';

    // Get distinct landlord IDs from Listings
    const landlordIds = await Listing.distinct("userRef");
    console.log('Found landlord IDs:', landlordIds);

    // Filter out invalid ObjectIds
    const validLandlordIds = landlordIds.filter(id => 
      mongoose.Types.ObjectId.isValid(id)
    );
    console.log('Valid landlord IDs:', validLandlordIds);

    if (validLandlordIds.length === 0) {
      return res.status(200).json({
        landlords: [],
        totalLandlords: 0,
        limit,
        startIndex
      });
    }

    // Build search query
    const query = {
      _id: { $in: validLandlordIds },
      ...(searchTerm && {
        $or: [
          { username: { $regex: searchTerm, $options: 'i' } },
          { email: { $regex: searchTerm, $options: 'i' } }
        ]
      })
    };

    // Find landlords with pagination
    const landlords = await User.find(query)
      .sort({ [sort]: order })
      .limit(limit)
      .skip(startIndex);

    console.log(`Found ${landlords.length} landlords`);

    // Transform landlords with rating details
    const transformedLandlords = await Promise.all(landlords.map(async landlord => {
      try {
        // Get rating details safely
        const ratingDetails = landlord.getRatingDetails();
        
        // Count listings for this landlord
        const listingCount = await Listing.countDocuments({ 
          userRef: landlord._id 
        });

        return {
          _id: landlord._id,
          username: landlord.username,
          email: landlord.email,
          avatar: landlord.avatar,
          listingCount,
          averageRating: ratingDetails.overall.averageRating,
          totalRatings: ratingDetails.overall.totalRatings,
          categoryRatings: ratingDetails.categories
        };
      } catch (error) {
        console.error(`Error processing landlord ${landlord._id}:`, error);
        // Return landlord with default values if there's an error
        return {
          _id: landlord._id,
          username: landlord.username,
          email: landlord.email,
          avatar: landlord.avatar,
          listingCount: 0,
          averageRating: 0,
          totalRatings: 0,
          categoryRatings: {
            responseTime: 0,
            maintenance: 0,
            experience: 0
          }
        };
      }
    }));

    // Get total count for pagination
    const totalLandlords = await User.countDocuments(query);

    console.log('Sending response with transformed landlords');
    res.status(200).json({
      landlords: transformedLandlords,
      totalLandlords,
      limit,
      startIndex
    });
  } catch (error) {
    console.error('Error in getLandlords:', error);
    next(errorHandler(500, "An error occurred while fetching landlords.", error));
  }
};

export const getTenants = async (req, res, next) => {
  try {
    const { sort = 'overallRating' } = req.query;

    // Get all landlord IDs from listings
    const landlordIds = await Listing.distinct("userRef");
    const validLandlordIds = landlordIds.filter((id) => mongoose.Types.ObjectId.isValid(id));

    // Find users who are not landlords
    const tenants = await User.find(
      { _id: { $nin: validLandlordIds } },
      "username email avatar"
    );

    // Return basic tenant info - ratings will be fetched from tenant-rating endpoint
    res.status(200).json({
      success: true,
      tenants: tenants.map(tenant => ({
        _id: tenant._id,
        username: tenant.username,
        email: tenant.email,
        avatar: tenant.avatar || 'https://via.placeholder.com/150'
      }))
    });

  } catch (error) {
    console.error("Error getting tenants:", error);
    next(errorHandler(500, "An error occurred while fetching tenants."));
  }
};

export const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find({}, { password: 0 }); // Exclude password field
    res.json(users);
  } catch (error) {
    next(error);
  }
};