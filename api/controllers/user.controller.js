import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/user.model.js";
import Listing from "../models/listing.model.js";
import { errorHandler } from "../utils/error.js"; // Assuming this handles error responses

//Helper function to create consistent error responses
const createErrorResponse = (statusCode, message) => ({ statusCode, message });

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
    res.status(200).json({ message: "User has been deleted." }); //Standardized response
  } catch (error) {
    console.error("Error deleting user:", error);
    next(createErrorResponse(500, "An error occurred while deleting the user."));
  }
};


export const getUserListings = async (req, res, next) => {
  try {
    const userId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return next(createErrorResponse(400, "Invalid user ID."));
    }

    const listings = await Listing.find({ userRef: userId });
    const user = await User.findById(userId, "username email avatar ratings ratedBy");

    if (!user) {
      return next(createErrorResponse(404, "User not found."));
    }

    const averageRating = user.ratings.length > 0
      ? user.ratings.reduce((sum, r) => sum + r, 0) / user.ratings.length
      : null;

    res.status(200).json({
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        averageRating,
        totalRatings: user.ratedBy.length,
      },
      listings,
    });
  } catch (error) {
    console.error("Error getting user listings:", error);
    next(createErrorResponse(500, "An error occurred while fetching user listings."));
  }
};

export const getUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(createErrorResponse(400, "Invalid user ID."));
    }

    const user = await User.findById(id, "username email avatar ratings ratedBy");
    if (!user) {
      return next(createErrorResponse(404, "User not found."));
    }

    const averageRating = user.ratings.length > 0
      ? user.ratings.reduce((sum, r) => sum + r, 0) / user.ratings.length
      : null;

    res.status(200).json({
      _id: user._id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
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

  // Validate input
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

    // Calculate the new rating
    const newRating = (responseTime + maintenance + experience) / 3;

    // Update landlord ratings and recalculate averageRating
    landlord.ratings.push(newRating);
    landlord.ratedBy.push(req.user.id);
    await landlord.updateAverageRating();

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

  // Validate ratings
  const ratings = [maintenance, behavior, payments];
  if (ratings.some((rating) => rating < 1 || rating > 5)) {
    return next(createErrorResponse(400, "Each rating must be between 1 and 5."));
  }

  try {
    // Ensure the user rating the tenant is a landlord
    const isLandlord = await Listing.exists({ userRef: req.user.id });
    if (!isLandlord) {
      return next(createErrorResponse(403, "Only landlords can rate tenants."));
    }

    const tenant = await User.findById(tenantId);
    if (!tenant) return next(createErrorResponse(404, "Tenant not found."));
    if (tenant.ratedBy.includes(req.user.id)) {
      return next(createErrorResponse(403, "You have already rated this tenant."));
    }

    // Calculate the new rating and update fields
    const newRating = (maintenance + behavior + payments) / 3;
    tenant.ratings.push(newRating);
    tenant.ratedBy.push(req.user.id);

    // Recalculate and save the average rating
    await tenant.updateAverageRating();

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
      "username avatar ratings ratedBy"
    );

    const landlordsWithRatings = landlords.map((landlord) => ({
      _id: landlord._id,
      username: landlord.username,
      avatar: landlord.avatar,
      averageRating: landlord.ratings.length > 0
        ? landlord.ratings.reduce((sum, r) => sum + r, 0) / landlord.ratings.length
        : null,
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
      "username avatar ratings ratedBy"
    );

    const tenantsWithRatings = tenants.map((tenant) => ({
      _id: tenant._id,
      username: tenant.username,
      avatar: tenant.avatar,
      averageRating: tenant.ratings.length > 0
        ? tenant.ratings.reduce((sum, r) => sum + r, 0) / tenant.ratings.length
        : null,
      totalRatings: tenant.ratedBy.length,
    }));

    res.status(200).json(tenantsWithRatings);
  } catch (error) {
    console.error("Error getting tenants:", error);
    next(createErrorResponse(500, "An error occurred while fetching tenants."));
  }
};