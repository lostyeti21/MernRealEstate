import mongoose from "mongoose";
import Listing from "../models/listing.model.js";
import User from "../models/user.model.js";
import { RealEstateCompany } from "../models/realEstateCompany.model.js";
import { errorHandler } from "../utils/error.js";

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

    const listing = await Listing.create({
      ...listingData,
      userRef,
      userModel: userModel || 'User' // Default to User model if not specified
    });

    res.status(201).json({
      success: true,
      listing
    });
  } catch (error) {
    console.error('Error creating listing:', error);
    next(error);
  }
};

export const deleteListing = async (req, res, next) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) {
      return next(errorHandler(404, 'Listing not found!'));
    }

    await Listing.findByIdAndDelete(req.params.id);
    res.status(200).json('Listing has been deleted!');
  } catch (error) {
    next(error);
  }
};

export const updateListing = async (req, res, next) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Listing not found!'
      });
    }

    // Check if user has permission to update
    if (listing.userRef.toString() !== req.user.id && !req.user.isAdmin) {
      return res.status(401).json({
        success: false,
        message: 'You can only update your own listings!'
      });
    }

    const updatedListing = await Listing.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.status(200).json({
      success: true,
      listing: updatedListing
    });
  } catch (error) {
    next(error);
  }
};

export const getListing = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid listing ID format'
      });
    }

    const listing = await Listing.findById(id);
    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Listing not found'
      });
    }

    // If the listing belongs to an agent or company, get additional info
    if (listing.userModel === 'Agent' || listing.userModel === 'RealEstateCompany') {
      const company = await RealEstateCompany.findOne({
        $or: [
          { _id: listing.userRef },
          { 'agents._id': listing.userRef }
        ]
      });

      if (company) {
        let agentInfo = null;
        if (listing.userModel === 'Agent') {
          const agent = company.agents.find(a => a._id.toString() === listing.userRef);
          if (agent) {
            agentInfo = {
              name: agent.name,
              email: agent.email,
              avatar: agent.avatar,
              contact: agent.contact,
              companyName: company.companyName
            };
          }
        }

        listing._doc.agentInfo = agentInfo;
        listing._doc.companyInfo = {
          companyName: company.companyName,
          avatar: company.avatar
        };
      }
    }

    res.status(200).json({
      success: true,
      listing
    });
  } catch (error) {
    console.error('Error in getListing:', error);
    next(error);
  }
};

export const getListings = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 8;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;
    
    let query = {};

    // Search term
    if (req.query.searchTerm) {
      query.$or = [
        { name: { $regex: req.query.searchTerm, $options: 'i' } },
        { address: { $regex: req.query.searchTerm, $options: 'i' } },
        { description: { $regex: req.query.searchTerm, $options: 'i' } }
      ];
    }

    // Type filter
    if (req.query.type && req.query.type !== 'all') {
      query.type = req.query.type;
    }

    // Amenities filters
    if (req.query.parking === 'true') query.parking = true;
    if (req.query.furnished === 'true') query.furnished = true;
    if (req.query.backupPower === 'true') query.backupPower = true;
    if (req.query.backupWaterSupply === 'true') query.backupWaterSupply = true;
    if (req.query.boreholeWater === 'true') query.boreholeWater = true;
    if (req.query.offer === 'true') query.offer = true;

    // Price range
    if (req.query.minPrice || req.query.maxPrice) {
      query.regularPrice = {};
      if (req.query.minPrice) query.regularPrice.$gte = parseInt(req.query.minPrice);
      if (req.query.maxPrice) query.regularPrice.$lte = parseInt(req.query.maxPrice);
    }

    // Sort
    const sort = {};
    if (req.query.sort && req.query.order) {
      sort[req.query.sort] = req.query.order === 'desc' ? -1 : 1;
    } else {
      sort.createdAt = -1;
    }

    // Get total count for pagination
    const total = await Listing.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    // Get listings
    const listings = await Listing.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      listings,
      totalPages,
      currentPage: page,
      total
    });

  } catch (error) {
    next(error);
  }
};

export const getLandlordListings = async (req, res, next) => {
  try {
    const listings = await Listing.find({ userRef: req.params.id });
    res.status(200).json(listings);
  } catch (error) {
    next(error);
  }
};

export const getAgentListings = async (req, res) => {
  try {
    const { agentId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(agentId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid agent ID'
      });
    }

    const listings = await Listing.find({ 
      userRef: agentId
    }).sort({ createdAt: -1 });
    
    console.log(`Found ${listings.length} listings for agent ID: ${agentId}`);

    res.status(200).json({
      success: true,
      listings
    });
  } catch (error) {
    console.error('Error getting agent listings:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const getUserListings = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Check if the ID is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }

    // First try to find listings for a regular user
    let listings = await Listing.find({ userRef: id, userModel: 'User' });

    // If no listings found, check if it's a real estate company
    if (listings.length === 0) {
      const company = await RealEstateCompany.findById(id);
      if (company) {
        // Get all agent IDs from the company
        const agentIds = company.agents.map(agent => agent._id.toString());

        // Find all listings that belong to the company or its agents
        listings = await Listing.find({
          $or: [
            { userRef: { $in: agentIds }, userModel: 'Agent' },
            { userRef: id, userModel: 'RealEstateCompany' }
          ]
        });
      }
    }

    res.status(200).json({
      success: true,
      listings
    });
  } catch (error) {
    console.error('Error in getUserListings:', error);
    next(error);
  }
};

