import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import { RealEstateCompany } from "../models/realEstateCompany.model.js";
import { errorHandler } from "../utils/error.js";
import Listing from "../models/listing.model.js";

// Agent Sign In
export const agentSignin = async (req, res) => {
  try {
    const { companyName, email, password } = req.body;

    const company = await RealEstateCompany.findOne({ companyName });
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    const agent = company.agents.find(a => a.email === email);
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }

    const validPassword = bcryptjs.compareSync(password, agent.password);
    if (!validPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const token = jwt.sign(
      { id: agent._id, isAgent: true },
      process.env.JWT_SECRET
    );

    // Include contact information in the response
    const agentData = {
      _id: agent._id,
      name: agent.name,
      email: agent.email,
      avatar: agent.avatar,
      contact: agent.contact,
      companyName: company.companyName
    };

    res.status(200).json({
      success: true,
      token,
      agent: agentData
    });
  } catch (error) {
    console.error('Agent signin error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Add Agent
export const addAgent = async (req, res, next) => {
  try {
    const { companyId } = req.body;
    const { name, email, password, contact } = req.body.agent;

    const company = await RealEstateCompany.findById(companyId);
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    // Check if agent with email already exists
    const existingAgent = company.agents.find(agent => agent.email === email);
    if (existingAgent) {
      return res.status(400).json({
        success: false,
        message: 'Agent with this email already exists'
      });
    }

    // Hash the password
    const hashedPassword = await bcryptjs.hash(password, 10);

    // Create new agent with contact as string
    const newAgent = {
      name,
      email,
      password: hashedPassword,
      contact, // Store contact directly as string
      avatar: "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png",
      ratings: [],
      averageRating: 0
    };

    company.agents.push(newAgent);
    await company.save();

    res.status(201).json({
      success: true,
      message: 'Agent added successfully',
      agent: {
        ...newAgent,
        password: undefined
      }
    });

  } catch (error) {
    console.error('Error adding agent:', error);
    next(error);
  }
};

// Other necessary exports
export const signin = async (req, res, next) => {
  try {
    const { companyName, email, password } = req.body;

    // Find the company
    const company = await RealEstateCompany.findOne({ companyName });
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    // Verify company email
    if (company.email !== email) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Verify password
    const validPassword = bcryptjs.compareSync(password, company.password);
    if (!validPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Create JWT token
    const token = jwt.sign(
      { id: company._id, isCompany: true },
      process.env.JWT_SECRET
    );

    // Prepare company data (excluding sensitive information)
    const companyData = {
      _id: company._id,
      companyName: company.companyName,
      email: company.email,
      avatar: company.avatar,
      agents: company.agents.map(agent => ({
        _id: agent._id,
        name: agent.name,
        email: agent.email,
        avatar: agent.avatar,
        contact: agent.contact,
        averageRating: agent.averageRating
      })),
      companyRating: company.companyRating
    };

    res.status(200).json({
      success: true,
      token,
      company: companyData
    });

  } catch (error) {
    console.error('Company signin error:', error);
    next(error);
  }
};

export const getCompanyData = async (req, res, next) => {
  // ... implementation
};

export const updateCompany = async (req, res, next) => {
  // ... implementation
};

export const removeAgent = async (req, res, next) => {
  // ... implementation
};

export const updateAgent = async (req, res, next) => {
  // ... implementation
};

export const getRealEstateCompanyData = async (req, res, next) => {
  try {
    const { companyId } = req.params;
    console.log('Fetching company data for ID:', companyId);

    const company = await RealEstateCompany.findById(companyId);
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    // Prepare company data without sensitive information
    const companyData = {
      _id: company._id,
      companyName: company.companyName,
      email: company.email,
      avatar: company.avatar,
      agents: company.agents.map(agent => ({
        _id: agent._id,
        name: agent.name,
        email: agent.email,
        avatar: agent.avatar,
        contact: agent.contact,
        averageRating: agent.averageRating || 0,
        ratings: agent.ratings || []
      })),
      averageRating: company.averageRating || 0,
      companyRating: company.companyRating || 0
    };

    res.status(200).json({
      success: true,
      company: companyData
    });

  } catch (error) {
    console.error('Error fetching company data:', error);
    next(error);
  }
};

export const updateAvatar = async (req, res, next) => {
  // ... implementation
};

export const getCompanyListings = async (req, res, next) => {
  try {
    const { companyId } = req.params;
    
    // First, get the company to get all agent IDs
    const company = await RealEstateCompany.findById(companyId);
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    // Get all agent IDs from the company
    const agentIds = company.agents.map(agent => agent._id.toString());

    // Find all listings that belong to any of the company's agents
    const listings = await Listing.find({
      $or: [
        { userRef: { $in: agentIds }, userModel: 'Agent' },  // Listings by agents
        { userRef: companyId, userModel: 'RealEstateCompany' }  // Listings by company directly
      ]
    }).sort({ createdAt: -1 });

    console.log(`Found ${listings.length} listings for company ${companyId}`);
    console.log('Agent IDs:', agentIds);

    // Populate agent information for each listing
    const populatedListings = await Promise.all(listings.map(async (listing) => {
      if (listing.userModel === 'Agent') {
        const agent = company.agents.find(a => a._id.toString() === listing.userRef);
        if (agent) {
          return {
            ...listing.toObject(),
            agent: {
              _id: agent._id,
              name: agent.name,
              email: agent.email,
              avatar: agent.avatar,
              contact: agent.contact
            }
          };
        }
      }
      return listing.toObject();
    }));

    res.status(200).json({
      success: true,
      listings: populatedListings
    });
  } catch (error) {
    console.error('Error fetching company listings:', error);
    next(error);
  }
};

export const getAgentListings = async (req, res, next) => {
  try {
    const { agentId } = req.params;
    console.log('Backend: Fetching listings for agent:', agentId);

    // First find the company that has this agent
    const company = await RealEstateCompany.findOne({
      'agents._id': agentId
    });

    if (!company) {
      console.log('Backend: Company not found for agent:', agentId);
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }

    // Get the agent's data
    const agent = company.agents.find(a => a._id.toString() === agentId);
    if (!agent) {
      console.log('Backend: Agent not found in company');
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }

    console.log('Backend: Found agent:', agent.name);

    // Get agent's listings - modified to match RealEstateDashboard logic
    const listings = await Listing.find({
      $or: [
        { userRef: agentId, userModel: 'Agent' },
        { userRef: company._id, userModel: 'RealEstateCompany' }
      ]
    }).sort({ createdAt: -1 });

    console.log('Backend: Found listings:', listings.length);

    // Prepare agent data
    const agentData = {
      _id: agent._id,
      name: agent.name,
      email: agent.email,
      avatar: agent.avatar,
      contact: agent.contact,
      averageRating: agent.averageRating || 0,
      ratings: agent.ratings || [],
      companyName: company.companyName,
      companyAvatar: company.avatar,
      totalListings: listings.length
    };

    res.status(200).json({
      success: true,
      agent: agentData,
      listings: listings.map(listing => ({
        ...listing.toObject(),
        agent: {
          _id: agent._id,
          name: agent.name,
          avatar: agent.avatar,
          companyName: company.companyName
        }
      }))
    });

  } catch (error) {
    console.error('Backend Error:', error);
    next(error);
  }
};

export const updateAgentAvatar = async (req, res) => {
  try {
    const { agentId, avatar } = req.body;

    const company = await RealEstateCompany.findOne({
      'agents._id': agentId
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }

    const agent = company.agents.id(agentId);
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }

    agent.avatar = avatar;
    await company.save();

    res.status(200).json({
      success: true,
      message: 'Avatar updated successfully'
    });

  } catch (error) {
    console.error('Error updating agent avatar:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get single agent
export const getAgent = async (req, res) => {
  try {
    const { agentId } = req.params;
    
    // Find the company that has this agent
    const company = await RealEstateCompany.findOne({
      'agents._id': agentId
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }

    // Get the agent's data
    const agent = company.agents.find(a => a._id.toString() === agentId);
    
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }

    // Add company ID to agent data
    const agentData = {
      ...agent.toObject(),
      companyId: company._id
    };

    res.status(200).json({
      success: true,
      agent: agentData
    });

  } catch (error) {
    console.error('Error in getAgent:', error);
    res.status(500).json({
      success: false,
      message: 'Something went wrong!',
      error: error.message
    });
  }
};

// Get company details
export const getCompany = async (req, res) => {
  try {
    const { companyId } = req.params;
    
    const company = await RealEstateCompany.findById(companyId);
    
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    res.status(200).json({
      success: true,
      company: {
        _id: company._id,
        companyName: company.companyName,
        avatar: company.avatar,
        rating: company.rating || 0
      }
    });

  } catch (error) {
    console.error('Error in getCompany:', error);
    res.status(500).json({
      success: false,
      message: 'Something went wrong!',
      error: error.message
    });
  }
};
