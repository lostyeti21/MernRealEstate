import mongoose from "mongoose";
import Listing from "../models/listing.model.js";
import RealEstateCompany from "../models/realestatecompany.model.js";
import User from "../models/user.model.js";
import { errorHandler } from "../utils/error.js";

export const createListing = async (req, res, next) => {
  try {
    console.log('Create Listing Request:', {
      body: JSON.stringify(req.body, null, 2),
      user: JSON.stringify(req.user, null, 2)
    });

    // Check if the user is an agent
    if (req.user.isAgent) {
      const company = await RealEstateCompany.findOne({
        'agents._id': req.user._id
      });

      if (!company) {
        return next(errorHandler(404, 'Agent not found in any company'));
      }

      const agent = company.agents.find(a => 
        a._id.toString() === req.user._id.toString()
      );

      if (!agent) {
        return next(errorHandler(404, 'Agent not found'));
      }

      const listing = await Listing.create({
        ...req.body,
        userRef: req.user._id,
        userModel: 'Agent',
        companyRef: company._id,
        agentInfo: {
          _id: agent._id,
          name: agent.name,
          email: agent.email,
          phone: agent.phone || '',
          avatar: agent.avatar || '',
          companyName: company.companyName,
          companyId: company._id,
          companyEmail: company.email || '',
          companyPhone: company.phone || '',
          companyAddress: company.address || ''
        }
      });

      return res.status(201).json({
        success: true,
        listing
      });
    }

    // For regular users
    const listing = await Listing.create({
      ...req.body,
      userRef: req.user._id,
      userModel: 'User'
    });

    return res.status(201).json({
      success: true,
      listing
    });

  } catch (error) {
    console.error('Create listing error:', error);
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

    // Convert IDs to strings for comparison
    const listingUserId = listing.userRef.toString();
    const requestUserId = req.user.isAgent ? req.user._id.toString() : req.user.id;

    // Check if user has permission to update
    if (listingUserId !== requestUserId) {
      return res.status(401).json({
        success: false,
        message: 'You can only update your own listings!'
      });
    }

    // Prepare update data
    const updateData = {
      ...req.body,
      userRef: req.user.isAgent ? req.user._id : req.user.id,
      userModel: req.user.isAgent ? 'Agent' : 'User'
    };

    // If it's an agent, get and include agent info
    if (req.user.isAgent) {
      const company = await RealEstateCompany.findOne({
        'agents._id': req.user._id
      });

      if (company) {
        const agent = company.agents.find(a => 
          a._id.toString() === req.user._id.toString()
        );

        if (agent) {
          updateData.agentInfo = {
            _id: agent._id,
            name: agent.name,
            email: agent.email,
            phone: agent.phone || '',
            avatar: agent.avatar || '',
            companyName: company.companyName,
            companyId: company._id,
            companyEmail: company.email || '',
            companyPhone: company.phone || '',
            companyAddress: company.address || ''
          };
        }
      }
    }

    const updatedListing = await Listing.findByIdAndUpdate(
      req.params.id,
      updateData,
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
      return next(errorHandler(400, 'Invalid listing ID'));
    }

    const listing = await Listing.findById(id);
    
    if (!listing) {
      return next(errorHandler(404, 'Listing not found'));
    }

    // Create a mutable copy of the listing
    const listingData = listing.toObject();

    // If listing belongs to an agent, get agent info
    if (listing.userModel === 'Agent') {
      try {
        // Find the company that has this agent
        const company = await RealEstateCompany.findOne({
          'agents._id': listing.userRef
        });

        if (company) {
          const agent = company.agents.find(a => 
            a._id.toString() === listing.userRef.toString()
          );

          if (agent) {
            // Add agent and company info directly to the listing response
            listingData.agent = {
              _id: agent._id,
              name: agent.name,
              email: agent.email,
              phone: agent.phone || '',
              avatar: agent.avatar || '',
              averageRating: agent.averageRating || 0,
              ratings: agent.ratings || []
            };
            
            listingData.company = {
              _id: company._id,
              name: company.companyName,
              email: company.email || '',
              phone: company.phone || '',
              address: company.address || '',
              avatar: company.avatar || ''
            };
          }
        }
      } catch (error) {
        console.error('Error fetching agent/company data:', error);
        // Continue without agent data rather than failing
      }
    }

    res.status(200).json({
      success: true,
      listing: listingData
    });

  } catch (error) {
    next(error);
  }
};

export const getListings = async (req, res, next) => {
  try {
    const {
      searchTerm,
      type,
      parking,
      furnished,
      offer,
      sort,
      order,
      minPrice,
      maxPrice,
      page = 1,
      limit = 8
    } = req.query;

    // Calculate skip for pagination
    const skip = (page - 1) * limit;

    // Build query object
    const query = {};

    // Add filters
    if (type && type !== 'all') {
      query.type = type;
    }

    if (parking === 'true') {
      query.parking = true;
    }

    if (furnished === 'true') {
      query.furnished = true;
    }

    if (offer === 'true') {
      query.offer = true;
    }

    if (searchTerm) {
      query.$or = [
        { name: { $regex: searchTerm, $options: 'i' } },
        { description: { $regex: searchTerm, $options: 'i' } }
      ];
    }

    if (minPrice || maxPrice) {
      query.regularPrice = {};
      if (minPrice) query.regularPrice.$gte = parseInt(minPrice);
      if (maxPrice) query.regularPrice.$lte = parseInt(maxPrice);
    }

    // Build sort object
    let sortObj = {};
    if (sort === 'price') {
      sortObj.regularPrice = order === 'desc' ? -1 : 1;
    } else if (sort === 'createdAt') {
      sortObj.createdAt = order === 'desc' ? -1 : 1;
    } else {
      sortObj.createdAt = -1; // Default sort
    }

    console.log('Search query:', {
      query,
      sort: sortObj,
      skip,
      limit: parseInt(limit)
    });

    // Execute query
    const listings = await Listing.find(query)
      .sort(sortObj)
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const total = await Listing.countDocuments(query);

    res.status(200).json({
      success: true,
      listings,
      total,
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Get listings error:', error);
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

export const getAgentListings = async (req, res, next) => {
  try {
    const agentId = req.params.id;
    console.log('Getting listings for agent:', {
      agentId,
      requestUser: {
        _id: req.user._id,
        isAgent: req.user.isAgent,
        isRealEstateCompany: req.user.isRealEstateCompany
      }
    });

    // If the request is from a company, verify the agent belongs to them
    if (req.user.isRealEstateCompany) {
      const company = await RealEstateCompany.findById(req.user._id);
      const isAgentInCompany = company.agents.some(agent => 
        agent._id.toString() === agentId
      );

      if (!isAgentInCompany) {
        return next(errorHandler(403, 'Agent does not belong to your company'));
      }
    }
    // If the request is from an agent, they can only view their own listings
    else if (req.user.isAgent && req.user._id.toString() !== agentId) {
      return next(errorHandler(403, 'You can only view your own listings'));
    }

    // Find all listings where the agent is either the creator or assigned agent
    const listings = await Listing.find({
      $or: [
        { userRef: agentId, userModel: 'Agent' },
        { 'agentInfo._id': agentId }
      ]
    }).sort({ createdAt: -1 });

    console.log('Found listings for agent:', {
      agentId,
      count: listings.length,
      listingIds: listings.map(l => l._id)
    });

    res.status(200).json({
      success: true,
      listings
    });
  } catch (error) {
    console.error('Error in getAgentListings:', error);
    next(error);
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

export const expressInterest = async (req, res, next) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) {
      return next(errorHandler(404, 'Listing not found'));
    }

    // Check if user is the owner of the listing
    if (listing.userRef.toString() === req.user.id) {
      return next(errorHandler(400, 'You cannot express interest in your own listing'));
    }

    // Update the listing using findByIdAndUpdate
    const updatedListing = await Listing.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { interestedUsers: req.user.id } },
      { new: true, runValidators: false }
    );

    res.status(200).json({
      success: true,
      message: 'Interest expressed successfully',
      listing: updatedListing
    });
  } catch (error) {
    next(error);
  }
};
