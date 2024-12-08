import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/user.model.js";
import Listing from "../models/listing.model.js";
import { errorHandler } from "../utils/error.js";

export const updateUser = async (req, res, next) => {
  if (req.user.id !== req.params.id)
    return next(errorHandler(401, "You can only update your own account!"));

  try {
    if (req.body.password) {
      req.body.password = bcrypt.hashSync(req.body.password, 10);
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );

    if (!updatedUser) return next(errorHandler(404, "User not found."));

    const { password, ...rest } = updatedUser._doc;
    res.status(200).json(rest);
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req, res, next) => {
  if (req.user.id !== req.params.id)
    return next(errorHandler(401, "You can only delete your own account!"));

  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);
    if (!deletedUser) return next(errorHandler(404, "User not found."));

    res.clearCookie("access_token");
    res.status(200).json("User has been deleted.");
  } catch (error) {
    next(error);
  }
};

export const getUserListings = async (req, res, next) => {
  try {
    const userId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return next(errorHandler(400, "Invalid user ID."));
    }

    const listings = await Listing.find({ userRef: userId });
    if (!listings || listings.length === 0) {
      return res.status(404).json({ message: "No listings found for this user." });
    }

    const user = await User.findById(userId, "username email avatar ratings ratedBy");
    if (!user) return next(errorHandler(404, "User not found."));

    const averageRating =
      user.ratings.length > 0
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
    next(error);
  }
};

export const getUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid user ID." });
    }

    const user = await User.findById(id, "username email avatar ratings ratedBy");
    if (!user) return next(errorHandler(404, "User not found."));

    const averageRating =
      user.ratings.length > 0
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
    next(errorHandler(500, "An error occurred while fetching user details."));
  }
};

// Allow tenants to rate landlords
export const rateLandlord = async (req, res, next) => {
  const { landlordId, rating } = req.body;

  // Validate rating range
  if (rating < 1 || rating > 5) {
    return next(errorHandler(400, "Rating must be between 1 and 5."));
  }

  try {
    // Check if the user is a landlord (users with listings cannot rate landlords)
    const isLandlord = await Listing.exists({ userRef: req.user.id });
    if (isLandlord) {
      return next(errorHandler(403, "Landlords cannot rate other landlords."));
    }

    // Check if the user is rating themselves
    if (req.user.id === landlordId) {
      return next(errorHandler(403, "You cannot rate yourself."));
    }

    const landlord = await User.findById(landlordId);
    if (!landlord) return next(errorHandler(404, "Landlord not found."));

    // Initialize ratings arrays if not already initialized
    if (!landlord.ratings) landlord.ratings = [];
    if (!landlord.ratedBy) landlord.ratedBy = [];

    // Check if the user already rated this landlord
    if (landlord.ratedBy.includes(req.user.id)) {
      return next(errorHandler(403, "You have already rated this landlord."));
    }

    // Add the rating and the user ID
    landlord.ratings.push(rating);
    landlord.ratedBy.push(req.user.id);

    // Save the updated landlord
    await landlord.save();

    // Calculate the average rating
    const averageRating =
      landlord.ratings.reduce((sum, r) => sum + r, 0) / landlord.ratings.length;

    // Respond with the updated average rating
    res.status(200).json({ averageRating, message: "Rating submitted successfully!" });
  } catch (error) {
    next(error);
  }
};


// Allow landlords to rate tenants
export const rateTenant = async (req, res, next) => {
  const { tenantId, rating } = req.body;

  // Validate the rating
  if (rating < 1 || rating > 5) {
    return next(errorHandler(400, "Rating must be between 1 and 5."));
  }

  try {
    // Ensure that the user is a landlord (users who are tenants cannot rate tenants)
    const isLandlord = await Listing.exists({ userRef: req.user.id });
    if (!isLandlord) {
      return next(errorHandler(403, "Only landlords can rate tenants."));
    }

    const tenant = await User.findById(tenantId);
    if (!tenant) return next(errorHandler(404, "Tenant not found."));

    // Initialize ratings and ratedBy if not already initialized
    if (!tenant.ratings) tenant.ratings = [];
    if (!tenant.ratedBy) tenant.ratedBy = [];

    // Prevent duplicate ratings by the same landlord
    if (tenant.ratedBy.includes(req.user.id)) {
      return next(errorHandler(403, "You have already rated this tenant."));
    }

    // Add the rating and the user ID
    tenant.ratings.push(rating);
    tenant.ratedBy.push(req.user.id);

    // Save the updated tenant
    await tenant.save();

    // Calculate the new average rating
    const averageRating =
      tenant.ratings.reduce((sum, r) => sum + r, 0) / tenant.ratings.length;

    // Respond with the updated average rating
    res.status(200).json({
      averageRating,
      message: "Rating submitted successfully!",
    });
  } catch (error) {
    console.error("Error in rateTenant:", error);
    next(error);
  }
};

// Retrieve all landlords from users who have listings
export const getLandlords = async (req, res, next) => {
  try {
    const landlordIds = await Listing.distinct("userRef");

    const validLandlordIds = landlordIds.filter((id) =>
      mongoose.Types.ObjectId.isValid(id)
    );

    if (validLandlordIds.length === 0) return res.status(200).json([]);

    const landlords = await User.find(
      { _id: { $in: validLandlordIds } },
      "username avatar ratings ratedBy"
    );

    const landlordsWithRatings = landlords.map((landlord) => ({
      _id: landlord._id,
      username: landlord.username,
      avatar: landlord.avatar,
      averageRating:
        landlord.ratings.length > 0
          ? landlord.ratings.reduce((sum, r) => sum + r, 0) / landlord.ratings.length
          : null,
      totalRatings: landlord.ratedBy.length,
    }));

    res.status(200).json(landlordsWithRatings);
  } catch (error) {
    next(error);
  }
};

// Get all tenants (users without listings)
export const getTenants = async (req, res, next) => {
  try {
    const landlordIds = await Listing.distinct("userRef");

    const validLandlordIds = landlordIds.filter((id) =>
      mongoose.Types.ObjectId.isValid(id)
    );

    const tenants = await User.find(
      { _id: { $nin: validLandlordIds } },
      "username avatar ratings ratedBy"
    );

    const tenantsWithRatings = tenants.map((tenant) => ({
      _id: tenant._id,
      username: tenant.username,
      avatar: tenant.avatar,
      averageRating:
        tenant.ratings.length > 0
          ? tenant.ratings.reduce((sum, r) => sum + r, 0) / tenant.ratings.length
          : null,
      totalRatings: tenant.ratedBy.length,
    }));

    res.status(200).json(tenantsWithRatings);
  } catch (error) {
    next(error);
  }
};

// Check if a user (tenant or landlord) has been rated
export const checkIfRated = async (req, res, next) => {
  const { landlordId } = req.params;

  try {
    const landlord = await User.findById(landlordId);
    if (!landlord) return next(errorHandler(404, "Landlord not found."));

    const alreadyRated = landlord.ratedBy.includes(req.user.id);
    res.status(200).json({ alreadyRated });
  } catch (error) {
    console.error("Error in checkIfRated:", error);
    next(error);
  }
};
