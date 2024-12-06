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
    const listings = await Listing.find({ userRef: req.params.id });
    res.status(200).json(listings);
  } catch (error) {
    next(error);
  }
};

export const getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) return next(errorHandler(404, "User not found!"));

    const { password: pass, ...rest } = user._doc;

    res.status(200).json(rest);
  } catch (error) {
    next(error);
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
    const landlordIds = await Listing.distinct("userRef");

    // Filter valid ObjectIds
    const validLandlordIds = landlordIds.filter((id) =>
      mongoose.Types.ObjectId.isValid(id)
    );

    const landlords = await User.find(
      { _id: { $in: validLandlordIds } },
      "username avatar ratings"
    );

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
      };
    });

    res.status(200).json(landlordsWithRatings);
  } catch (error) {
    next(error);
  }
};

export const getTenants = async (req, res, next) => {
  try {
    const landlordIds = await Listing.distinct("userRef");

    // Filter valid ObjectIds
    const validLandlordIds = landlordIds.filter((id) =>
      mongoose.Types.ObjectId.isValid(id)
    );

    const tenants = await User.find(
      { _id: { $nin: validLandlordIds } },
      "username avatar"
    );

    res.status(200).json(tenants);
  } catch (error) {
    next(error);
  }
};
