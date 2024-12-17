import Listing from "../models/listing.model.js";
import User from "../models/user.model.js";
import { errorHandler } from "../utils/error.js";

export const createListing = async (req, res, next) => {
  try {
    const listing = await Listing.create(req.body);
    return res.status(201).json(listing);
  } catch (error) {
    next(error);
  }
};

export const deleteListing = async (req, res, next) => {
  const listing = await Listing.findById(req.params.id);
  if (!listing) return next(errorHandler(404, "Listing not found"));

  if (req.user.id !== listing.userRef) {
    return next(errorHandler(403, "You can only delete your own listings"));
  }

  try {
    await Listing.findByIdAndDelete(req.params.id);
    res.status(200).json("Listing has been deleted!");
  } catch (error) {
    next(error);
  }
};

export const updateListing = async (req, res, next) => {
  const listing = await Listing.findById(req.params.id);
  if (!listing) return next(errorHandler(404, "Listing not found"));

  if (req.user.id !== listing.userRef) {
    return next(errorHandler(403, "You can only update your own listings"));
  }

  try {
    const updatedListing = await Listing.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.status(200).json(updatedListing);
  } catch (error) {
    next(error);
  }
};

export const getListing = async (req, res, next) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) return next(errorHandler(404, "Listing not found!"));

    const landlord = await User.findById(listing.userRef, "username avatar ratings");
    if (!landlord) {
      return next(errorHandler(404, "Landlord not found!"));
    }

    const averageRating =
      landlord.ratings.length > 0
        ? landlord.ratings.reduce((sum, r) => sum + r, 0) / landlord.ratings.length
        : 0;

    res.status(200).json({
      ...listing._doc,
      landlord: {
        username: landlord.username,
        avatar: landlord.avatar || "default-avatar.png",
        averageRating,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getListings = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 9;
    const startIndex = parseInt(req.query.startIndex) || 0;

    let offer = req.query.offer;
    if (offer === undefined || offer === "false") {
      offer = { $in: [false, true] };
    }

    let furnished = req.query.furnished;
    if (furnished === undefined || furnished === "false") {
      furnished = { $in: [false, true] };
    }

    let parking = req.query.parking;
    if (parking === undefined || parking === "false") {
      parking = { $in: [false, true] };
    }

    let type = req.query.type;
    if (type === undefined || type === "all") {
      type = { $in: ["sale", "rent"] };
    }

    const searchTerm = req.query.searchTerm || "";
    const sort = req.query.sort || "createdAt";
    const order = req.query.order || "desc";

    // Price range filtering
    const minPrice = parseFloat(req.query.minPrice) || 0;
    const maxPrice = parseFloat(req.query.maxPrice) || 10000000;

    const listings = await Listing.find({
      name: { $regex: searchTerm, $options: "i" },
      offer,
      furnished,
      parking,
      type,
      regularPrice: { $gte: minPrice, $lte: maxPrice }, // Price range filter
    })
      .sort({ [sort]: order })
      .limit(limit)
      .skip(startIndex);

    return res.status(200).json(listings);
  } catch (error) {
    next(error);
  }
};

export const getLandlordListings = async (req, res) => {
  const { userId } = req.params;

  console.log("Fetching listings for userId:", userId); // Debug log

  try {
    // Validate if userId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.log("Invalid userId:", userId); // Debug log
      return res.status(400).json({ message: "Invalid user ID." });
    }

    // Convert userId to ObjectId if it's not already
    const objectId = mongoose.Types.ObjectId(userId);

    // Fetch listings where userRef matches the ObjectId
    const listings = await Listing.find({ userRef: objectId });

    if (!listings.length) {
      console.log("No listings found for userId:", userId); // Debug log
      return res.status(404).json({ message: "No listings found for this user." });
    }

    console.log("Listings found for userId:", listings); // Debug log
    res.status(200).json(listings);
  } catch (error) {
    console.error("Error fetching landlord listings:", error.message);
    res.status(500).json({ message: "Internal server error." });
  }
};
