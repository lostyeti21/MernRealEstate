import mongoose from "mongoose";
import Listing from "../models/listing.model.js";
import User from "../models/user.model.js";
import { RealEstateCompany } from "../models/realEstateCompany.model.js";
import { errorHandler } from "../utils/error.js";

export const createListing = async (req, res, next) => {
  try {
    const { userRef, userModel, agentInfo, ...listingData } = req.body;

    // Validate required fields
    if (!userRef || !userModel) {
      return res.status(400).json({
        success: false,
        message: 'User reference and model are required'
      });
    }

    let finalAgentInfo = undefined;

    // If it's an agent listing, get the full agent info
    if (userModel === 'Agent') {
      const company = await RealEstateCompany.findOne({
        'agents._id': userRef
      });

      if (company) {
        const agent = company.agents.find(a => a._id.toString() === userRef);
        if (agent) {
          finalAgentInfo = {
            _id: agent._id,
            name: agent.name,
            email: agent.email,
            avatar: agent.avatar,
            contact: agent.contact,
            companyName: company.companyName,
            companyId: company._id
          };
        }
      }
    }

    // Create the listing with complete agent information
    const listing = await Listing.create({
      ...listingData,
      userRef,
      userModel,
      agentInfo: finalAgentInfo
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

    // Create a mutable copy of the listing
    const listingData = listing.toObject();

    // If listing belongs to an agent, get agent info
    if (listing.userModel === 'Agent') {
      console.log('Looking up agent info for:', listing.userRef);
      
      try {
        const company = await RealEstateCompany.findOne({
          'agents._id': listing.userRef
        });

        if (company) {
          const agent = company.agents.find(a => a._id.toString() === listing.userRef);
          if (agent) {
            const agentData = {
              _id: agent._id.toString(),
              name: agent.name,
              email: agent.email,
              avatar: agent.avatar,
              contact: agent.contact,
              companyName: company.companyName,
              companyId: company._id.toString()
            };

            // Update the listing data
            listingData.agent = agentData;
            listingData.agentInfo = agentData;

            // Update the database
            await Listing.findByIdAndUpdate(id, {
              agentInfo: agentData
            });
          }
        }
      } catch (agentError) {
        console.error('Error fetching agent data:', agentError);
        // Continue without agent data rather than failing the request
      }
    }

    // Send the response
    res.status(200).json({
      success: true,
      listing: listingData
    });

  } catch (error) {
    console.error('Error in getListing:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching listing'
    });
  }
};

export const getListings = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 9;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;

    const query = {};
    
    // Add search filters
    if (req.query.searchTerm) {
      query.$or = [
        { name: { $regex: req.query.searchTerm, $options: 'i' } },
        { description: { $regex: req.query.searchTerm, $options: 'i' } }
      ];
    }

    // Add other filters
    if (req.query.type && req.query.type !== 'all') {
      query.type = req.query.type;
    }

    if (req.query.parking === 'true') {
      query.parking = true;
    }

    if (req.query.furnished === 'true') {
      query.furnished = true;
    }

    if (req.query.offer === 'true') {
      query.offer = true;
    }

    // Get total count
    const total = await Listing.countDocuments(query);

    // Execute query with pagination
    const listings = await Listing.find(query)
      .sort({ createdAt: 'desc' })
      .skip(skip)
      .limit(limit);

    return res.status(200).json({
      success: true,
      listings,
      total,
      currentPage: page,
      totalPages: Math.ceil(total / limit)
    });

  } catch (error) {
    console.error('Error in getListings:', error);
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

