import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/user.model.js";
import Listing from "../models/listing.model.js";
import { errorHandler } from "../utils/error.js";

// Helper function to create consistent error responses
const createErrorResponse = (statusCode, message) => ({ statusCode, message });

// Utility function to calculate average rating
const calculateAverageRating = (ratings) => {
  return ratings.length > 0 ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length : null;
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

    const user = await User.findById(id, "username email avatar phoneNumbers ratings ratedBy");
    if (!user) {
      return next(createErrorResponse(404, "User not found."));
    }

    const averageRating = calculateAverageRating(user.ratings);

    res.status(200).json({
      _id: user._id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      phoneNumbers: user.phoneNumbers,
      averageRating,
      totalRatings: user.ratedBy.length,
    });
  } catch (error) {
    console.error("Error getting user:", error);
    next(createErrorResponse(500, "An error occurred while fetching user details."));
  }
};

export const rateLandlord = async (req, res, next) => {
  const { landlordId, responseTime, maintenance, experience } = req.body;

  if (![responseTime, maintenance, experience].every((r) => typeof r === "number" && r >= 1 && r <= 5)) {
    return next(errorHandler(400, "Each rating must be a valid number between 1 and 5."));
  }

  try {
    const landlord = await User.findById(landlordId);

    if (!landlord) return next(errorHandler(404, "Landlord not found."));
    if (req.user.id === landlordId) return next(errorHandler(403, "You cannot rate yourself."));
    if (landlord.ratedBy.includes(req.user.id)) {
      return next(errorHandler(403, "You have already rated this landlord."));
    }

    const newRating = (responseTime + maintenance + experience) / 3;
    landlord.ratings.push(newRating);
    landlord.ratedBy.push(req.user.id);
    
    // Calculate average rating directly
    landlord.averageRating = landlord.ratings.reduce((sum, rating) => sum + rating, 0) / landlord.ratings.length;
    
    await landlord.save();

    res.status(200).json({
      averageRating: landlord.averageRating,
      message: "Rating submitted successfully!",
    });
  } catch (error) {
    console.error("Error in rateLandlord:", error);
    next(errorHandler(500, "An error occurred while submitting the rating."));
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
  const { landlordId } = req.params;

  try {
    const landlord = await User.findById(landlordId);
    if (!landlord) return next(createErrorResponse(404, "Landlord not found."));

    const alreadyRated = landlord.ratedBy.includes(req.user.id);
    res.status(200).json({ alreadyRated });
  } catch (error) {
    console.error("Error checking if rated:", error);
    next(createErrorResponse(500, "An error occurred while checking if rated."));
  }
};

export const getLandlords = async (req, res, next) => {
  try {
    const landlordIds = await Listing.distinct("userRef");
    const validLandlordIds = landlordIds.filter((id) => mongoose.Types.ObjectId.isValid(id));

    if (validLandlordIds.length === 0) return res.status(200).json([]);

    const landlords = await User.find(
      { _id: { $in: validLandlordIds } },
      "username avatar phoneNumbers ratings ratedBy"
    );

    const landlordsWithRatings = landlords.map((landlord) => ({
      _id: landlord._id,
      username: landlord.username,
      avatar: landlord.avatar,
      phoneNumbers: landlord.phoneNumbers,
      averageRating: calculateAverageRating(landlord.ratings),
      totalRatings: landlord.ratedBy.length,
    }));

    res.status(200).json(landlordsWithRatings);
  } catch (error) {
    console.error("Error getting landlords:", error);
    next(createErrorResponse(500, "An error occurred while fetching landlords."));
  }
};

export const getTenants = async (req, res, next) => {
  try {
    const landlordIds = await Listing.distinct("userRef");
    const validLandlordIds = landlordIds.filter((id) => mongoose.Types.ObjectId.isValid(id));

    const tenants = await User.find(
      { _id: { $nin: validLandlordIds } },
      "username avatar phoneNumbers ratings ratedBy"
    );

    const tenantsWithRatings = tenants.map((tenant) => ({
      _id: tenant._id,
      username: tenant.username,
      avatar: tenant.avatar,
      phoneNumbers: tenant.phoneNumbers,
      averageRating: calculateAverageRating(tenant.ratings),
      totalRatings: tenant.ratedBy.length,
    }));

    res.status(200).json(tenantsWithRatings);
  } catch (error) {
    console.error("Error getting tenants:", error);
    next(createErrorResponse(500, "An error occurred while fetching tenants."));
  }
};