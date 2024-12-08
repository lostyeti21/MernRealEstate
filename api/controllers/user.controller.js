import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/user.model.js";
import { errorHandler } from "../utils/error.js";
import Listing from "../models/listing.model.js";

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
    await User.findByIdAndDelete(req.params.id);
    res.clearCookie("access_token");
    res.status(200).json("User has been deleted...");
  } catch (error) {
    next(error);
  }
};

export const getUserListings = async (req, res, next) => {
  try {
    const userId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return next(errorHandler(400, "Invalid landlord ID."));
    }

    const listings = await Listing.find({ userRef: userId });

    if (!listings || listings.length === 0) {
      return res.status(404).json({ message: "No listings found for this landlord." });
    }

    const landlord = await User.findById(userId, "username email avatar ratings ratedBy");
    if (!landlord) {
      return next(errorHandler(404, "Landlord not found."));
    }

    const averageRating =
      landlord.ratings.length > 0
        ? landlord.ratings.reduce((sum, r) => sum + r, 0) / landlord.ratings.length
        : null;

    res.status(200).json({
      landlord: {
        _id: landlord._id,
        username: landlord.username,
        email: landlord.email,
        avatar: landlord.avatar,
        averageRating,
        totalRatings: landlord.ratedBy.length,
      },
      listings,
    });
  } catch (error) {
    console.error("Error in getUserListings:", error);
    next(error);
  }
};


export const getUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate the landlord ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid landlord ID." });
    }

    // Fetch the landlord's details
    const user = await User.findById(id, "username email avatar ratings ratedBy");
    if (!user) {
      return res.status(404).json({ message: "Landlord not found." });
    }

    // Calculate average rating
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
    console.error("Error in getUser:", error);
    next(errorHandler(500, "An error occurred while fetching landlord details."));
  }
};




export const rateLandlord = async (req, res, next) => {
  const { landlordId, rating } = req.body;

  if (rating < 1 || rating > 5) {
    return next(errorHandler(400, "Rating must be between 1 and 5."));
  }

  try {
    if (req.user.id === landlordId) {
      return next(errorHandler(403, "You cannot rate yourself."));
    }

    const landlord = await User.findById(landlordId);
    if (!landlord) return next(errorHandler(404, "Landlord not found."));

    if (!landlord.ratings) landlord.ratings = [];
    if (!landlord.ratedBy) landlord.ratedBy = [];

    if (landlord.ratedBy.includes(req.user.id)) {
      return next(errorHandler(403, "You have already rated this landlord."));
    }

    landlord.ratings.push(rating);
    landlord.ratedBy.push(req.user.id);

    await landlord.save();

    const averageRating =
      landlord.ratings.reduce((sum, r) => sum + r, 0) / landlord.ratings.length;

    res.status(200).json({ averageRating, message: "Rating submitted successfully!" });
  } catch (error) {
    next(error);
  }
};

export const checkIfRated = async (req, res, next) => {
  const { landlordId } = req.params;

  try {
    const landlord = await User.findById(landlordId);
    if (!landlord) return next(errorHandler(404, "Landlord not found."));

    const alreadyRated = landlord.ratedBy.includes(req.user.id);
    res.status(200).json({ alreadyRated });
  } catch (error) {
    next(error);
  }
};

export const getLandlords = async (req, res, next) => {
  try {
    // Fetch distinct userRef values from the Listing model
    const landlordIds = await Listing.distinct("userRef");

    // Filter out invalid ObjectIds to avoid query issues
    const validLandlordIds = landlordIds.filter((id) =>
      mongoose.Types.ObjectId.isValid(id)
    );

    if (validLandlordIds.length === 0) {
      return res.status(200).json([]);
    }

    // Fetch users who have posted listings
    const landlords = await User.find(
      { _id: { $in: validLandlordIds } },
      "username avatar ratings ratedBy"
    );

    // Prepare landlords with ratings and details
    const landlordsWithRatings = landlords.map((landlord) => {
      const averageRating =
        landlord.ratings && landlord.ratings.length > 0
          ? landlord.ratings.reduce((sum, r) => sum + r, 0) / landlord.ratings.length
          : null;

      return {
        _id: landlord._id,
        username: landlord.username,
        avatar: landlord.avatar,
        averageRating,
        totalRatings: landlord.ratedBy ? landlord.ratedBy.length : 0,
      };
    });

    res.status(200).json(landlordsWithRatings);
  } catch (error) {
    console.error("Error in getLandlords:", error);
    next(error);
  }
};


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

    const tenantsWithRatings = tenants.map((tenant) => {
      const averageRating =
        tenant.ratings && tenant.ratings.length > 0
          ? tenant.ratings.reduce((sum, r) => sum + r, 0) / tenant.ratings.length
          : null;

      return {
        _id: tenant._id,
        username: tenant.username,
        avatar: tenant.avatar,
        averageRating,
        totalRatings: tenant.ratedBy.length,
      };
    });

    res.status(200).json(tenantsWithRatings);
  } catch (error) {
    next(error);
  }
};

export const rateTenant = async (req, res, next) => {
  const { tenantId, rating } = req.body;

  if (rating < 1 || rating > 5) {
    return next(errorHandler(400, "Rating must be between 1 and 5."));
  }

  try {
    const tenant = await User.findById(tenantId);
    if (!tenant) return next(errorHandler(404, "Tenant not found."));

    const isLandlord = await Listing.exists({ userRef: req.user.id });
    if (!isLandlord) {
      return next(errorHandler(403, "Only landlords can rate tenants."));
    }

    if (!tenant.ratings) tenant.ratings = [];
    if (!tenant.ratedBy) tenant.ratedBy = [];

    if (tenant.ratedBy.includes(req.user.id)) {
      return next(errorHandler(403, "You have already rated this tenant."));
    }

    tenant.ratings.push(rating);
    tenant.ratedBy.push(req.user.id);

    await tenant.save();

    const averageRating =
      tenant.ratings.reduce((sum, r) => sum + r, 0) / tenant.ratings.length;

    res.status(200).json({
      averageRating,
      message: "Rating submitted successfully!",
    });
  } catch (error) {
    next(error);
  }
};
