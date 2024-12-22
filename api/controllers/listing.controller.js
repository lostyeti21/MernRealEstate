import Listing from "../models/listing.model.js";
import User from "../models/user.model.js";
import RealEstateCompany from "../models/realEstateCompany.model.js";
import { errorHandler } from "../utils/error.js";
import mongoose from "mongoose";

export const createListing = async (req, res, next) => {
  try {
    const { userRef, userModel, ...listingData } = req.body;

    console.log('Creating listing with:', {
      userRef,
      userModel,
      listingData
    });

    if (!userRef) {
      return res.status(400).json({
        success: false,
        message: 'User reference is required'
      });
    }

    // Validate userRef is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(userRef)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user reference'
      });
    }

    const listing = new Listing({
      ...listingData,
      userRef,
      userModel: userModel || 'User' // Default to User if not specified
    });

    await listing.save();
    res.status(201).json(listing);
  } catch (error) {
    console.error('Create listing error:', error);
    next(error);
  }
};

export const deleteListing = async (req, res, next) => {
  try {
    const listing = await Listing.findById(req.params.id);
    
    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Listing not found"
      });
    }

    const isAgent = req.user.isAgent;
    const userId = req.user.id;

    console.log('Delete request details:', {
      isAgent,
      requestUserId: userId,
      listingUserRef: listing.userRef,
      listingUserModel: listing.userModel
    });

    // For agents, allow deletion of any listing shown in their listings
    if (isAgent) {
      await Listing.findByIdAndDelete(req.params.id);
      return res.status(200).json({
        success: true,
        message: "Listing has been deleted!"
      });
    } 
    
    // For regular users, check ownership
    if (!isAgent && listing.userModel === 'User') {
      if (listing.userRef.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: "You can only delete your own listings"
        });
      }
    }

    await Listing.findByIdAndDelete(req.params.id);
    
    res.status(200).json({
      success: true,
      message: "Listing has been deleted!"
    });
  } catch (error) {
    console.error('Error deleting listing:', error);
    next(error);
  }
};

export const updateListing = async (req, res, next) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) {
      return next(errorHandler(404, "Listing not found"));
    }

    // Check if the user is authorized to update this listing
    const isAgent = req.user.isAgent;
    const userId = req.user.id;

    if (listing.userRef !== userId) {
      return next(errorHandler(403, "You can only update your own listings"));
    }

    console.log('Updating listing:', {
      listingId: req.params.id,
      userId,
      isAgent,
      updates: req.body
    });

    const updatedListing = await Listing.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.status(200).json(updatedListing);
  } catch (error) {
    console.error('Error updating listing:', error);
    next(error);
  }
};

export const getListing = async (req, res, next) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) {
      return next(errorHandler(404, 'Listing not found'));
    }

    // Only fetch landlord data if the listing is from a regular user
    if (listing.userModel === 'User') {
      const landlord = await User.findById(listing.userRef, "username avatar ratings");
      if (!landlord) {
        return next(errorHandler(404, 'Landlord not found!'));
      }

      const averageRating = landlord.ratings.length > 0
        ? landlord.ratings.reduce((sum, r) => sum + r, 0) / landlord.ratings.length
        : 0;

      // Return listing with landlord data
      res.status(200).json({
        ...listing.toObject(),
        landlord: {
          username: landlord.username,
          avatar: landlord.avatar || "https://cdn-icons-png.flaticon.com/512/149/149071.png",
          averageRating
        }
      });
    } else if (listing.userModel === 'Agent') {
      // For agent listings, find the agent in RealEstateCompany
      const company = await RealEstateCompany.findOne({
        'agents._id': listing.userRef
      });

      if (!company) {
        return next(errorHandler(404, 'Agent not found!'));
      }

      const agent = company.agents.find(
        agent => agent._id.toString() === listing.userRef
      );

      if (!agent) {
        return next(errorHandler(404, 'Agent details not found!'));
      }

      // Calculate agent's average rating
      const agentRating = agent.ratings?.length > 0
        ? agent.ratings.reduce((sum, r) => sum + r, 0) / agent.ratings.length
        : 0;

      // Return listing with agent and company data, including default avatars
      res.status(200).json({
        ...listing.toObject(),
        agent: {
          name: agent.name,
          email: agent.email,
          avatar: agent.avatar || "https://cdn-icons-png.flaticon.com/512/149/149071.png",
          averageRating: agentRating,
          companyName: company.companyName,
          companyAvatar: company.avatar || "https://img.freepik.com/free-vector/grey-user-circles-set_78370-7045.jpg?semt=ais_hybrid",
          companyRating: company.companyRating || 0
        }
      });
    } else {
      // If userModel is neither User nor Agent, return just the listing
      res.status(200).json(listing);
    }
  } catch (error) {
    console.error('Error in getListing:', error);
    next(error);
  }
};

export const getListings = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 9;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;

    // Parse filters from query parameters
    const offer = req.query.offer === "true" ? true : req.query.offer === "false" ? false : undefined;
    const furnished = req.query.furnished === "true" ? true : req.query.furnished === "false" ? false : undefined;
    const parking = req.query.parking === "true" ? true : req.query.parking === "false" ? false : undefined;
    const backupPower = req.query.backupPower === "true" ? true : undefined;
    const backupWaterSupply = req.query.backupWaterSupply === "true" ? true : undefined;
    const boreholeWater = req.query.boreholeWater === "true" ? true : undefined; // Added borehole water filter

    const type =
    req.query.type && req.query.type !== "all"
      ? req.query.type
      : { $in: ["sale", "rent"] };
  

    const searchTerm = req.query.searchTerm || "";
    const sort = req.query.sort || "createdAt";
    const order = req.query.order || "desc";

    // Price range filtering
    const minPrice = parseFloat(req.query.minPrice) || 0;
    const maxPrice = parseFloat(req.query.maxPrice) || 10000000;

    // Build the query object dynamically
    const query = {
      name: { $regex: searchTerm, $options: "i" },
      type,
      regularPrice: { $gte: minPrice, $lte: maxPrice },
    };

    // Add filters to the query only if they are explicitly set
    if (offer !== undefined) query.offer = offer;
    if (furnished !== undefined) query.furnished = furnished;
    if (parking !== undefined) query.parking = parking;
    if (backupPower !== undefined) query.backupPower = backupPower;
    if (backupWaterSupply !== undefined) query.backupWaterSupply = backupWaterSupply;
    if (boreholeWater !== undefined) query.boreholeWater = boreholeWater; // Added borehole water filter

    const listings = await Listing.find(query)
      .sort({ [sort]: order })
      .limit(limit)
      .skip(skip);

    const totalListings = await Listing.countDocuments(query);
    const totalPages = Math.ceil(totalListings / limit);

    return res.status(200).json({
      listings,
      totalPages,
    });
  } catch (error) {
    next(error);
  }
};

export const getLandlordListings = async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('Getting listings for user:', userId);

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    // Find listings and sort by newest first
    const listings = await Listing.find({ userRef: userId })
      .sort({ createdAt: -1 });

    console.log('Found listings:', listings);

    // Always return success with empty array if no listings
    return res.status(200).json({
      success: true,
      listings: listings || []
    });

  } catch (error) {
    console.error('Error in getLandlordListings:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching listings'
    });
  }
};

export const getAgentListings = async (req, res, next) => {
  try {
    const agentId = req.params.id;
    
    if (!agentId) {
      return res.status(400).json({
        success: false,
        message: 'Agent ID is required'
      });
    }

    console.log('Finding listings for agent ID:', agentId);

    const listings = await Listing.find({ 
      userRef: agentId
    }).sort({ createdAt: -1 });
    
    console.log(`Found ${listings.length} listings for agent ID: ${agentId}`);

    if (listings.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No listings found for this agent',
        listings: []
      });
    }

    res.status(200).json({
      success: true,
      listings
    });
  } catch (error) {
    console.error('Error getting agent listings:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching listings'
    });
  }
};
