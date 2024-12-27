import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import bcryptjs from 'bcryptjs';
import { verifyToken } from '../utils/verifyUser.js';
import RealEstateCompany from '../models/realEstateCompany.model.js';
import { agentSignin, agentSignup } from '../controllers/auth.controller.js';
import { verifyAgent } from '../middleware/auth.js';
import Listing from '../models/listing.model.js';
import User from '../models/user.model.js';
import { errorHandler } from '../utils/error.js';

const router = express.Router();

// Simple verification endpoint
router.get('/verify', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'No token provided'
    });
  }

  try {
    jwt.verify(token, process.env.JWT_SECRET);
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
});

// Auth routes with detailed logging and validation
router.post('/agent-signin', async (req, res) => {
  try {
    const { companyName, email, password } = req.body;
    
    console.log('Agent signin attempt:', { companyName, email });

    // Input validation
    if (!companyName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Company name, email and password are required'
      });
    }

    // Find the company
    const company = await RealEstateCompany.findOne({ 
      companyName: { $regex: new RegExp(companyName, 'i') }
    });

    if (!company) {
      console.log('Company not found:', companyName);
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    // Find the agent within the company
    const agent = company.agents.find(a => a.email.toLowerCase() === email.toLowerCase());
    if (!agent) {
      console.log('Agent not found:', email);
      return res.status(404).json({
        success: false,
        message: 'Agent not found in this company'
      });
    }

    // Verify password
    const validPassword = await bcryptjs.compare(password, agent.password);
    if (!validPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate token
    const token = jwt.sign(
      { 
        id: agent._id,
        companyId: company._id,
        isAgent: true 
      },
      process.env.JWT_SECRET
    );

    // Prepare agent data (excluding sensitive info)
    const agentData = {
      _id: agent._id,
      name: agent.name,
      email: agent.email,
      avatar: agent.avatar,
      contact: agent.contact,
      companyId: company._id,
      companyName: company.companyName
    };

    console.log('Agent login successful:', {
      agentId: agent._id,
      companyId: company._id
    });

    // Send response
    return res.status(200).json({
      success: true,
      token,
      agent: agentData
    });

  } catch (error) {
    console.error('Agent signin error:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred during sign in',
      error: error.message
    });
  }
});

// Agent signup route
router.post('/agent-signup', async (req, res, next) => {
  try {
    const { username, email, password, companyName } = req.body;

    // Find or create company
    let company = await RealEstateCompany.findOne({ companyName });
    if (!company) {
      company = new RealEstateCompany({ 
        companyName, 
        location: req.body.location || 'Not specified' 
      });
      await company.save();
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Hash password
    const hashedPassword = bcryptjs.hashSync(password, 10);

    // Create new user
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      isAgent: true,
      realEstateCompany: company._id,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=random`
    });

    await newUser.save();

    // Generate token
    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET);

    const agentResponse = {
      success: true,
      token,
      agent: {
        _id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        avatar: newUser.avatar,
        company: {
          _id: company._id,
          name: company.companyName,
          location: company.location
        }
      }
    };

    res
      .cookie('access_token', token, { httpOnly: true })
      .status(201)
      .json(agentResponse);

  } catch (error) {
    console.error('Error in agent signup:', error);
    next(error);
  }
});

router.post('/update-avatar', verifyAgent, async (req, res) => {
  try {
    const { avatar, agentId } = req.body;

    const company = await RealEstateCompany.findOne({
      'agents._id': new mongoose.Types.ObjectId(agentId)
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }

    const agentIndex = company.agents.findIndex(
      agent => agent._id.toString() === agentId
    );

    if (agentIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }

    company.agents[agentIndex].avatar = avatar;
    await company.save();

    res.status(200).json({
      success: true,
      message: 'Avatar updated successfully',
      avatar: avatar
    });
  } catch (error) {
    console.error('Error updating avatar:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.post('/update-phone', verifyAgent, async (req, res) => {
  try {
    const { agentId, phoneNumber } = req.body;

    const company = await RealEstateCompany.findOne({
      'agents._id': new mongoose.Types.ObjectId(agentId)
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }

    const agentIndex = company.agents.findIndex(
      agent => agent._id.toString() === agentId
    );

    if (agentIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }

    // Update the agent's contact directly as a string
    company.agents[agentIndex].contact = phoneNumber;
    await company.save();

    res.status(200).json({
      success: true,
      message: 'Phone number updated successfully',
      contact: phoneNumber
    });
  } catch (error) {
    console.error('Error updating phone number:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.get('/data/:agentId', verifyAgent, async (req, res) => {
  try {
    const { agentId } = req.params;

    const company = await RealEstateCompany.findOne({
      'agents._id': new mongoose.Types.ObjectId(agentId)
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }

    const agent = company.agents.find(
      agent => agent._id.toString() === agentId
    );

    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }

    res.status(200).json({
      success: true,
      agent: {
        _id: agent._id,
        name: agent.name,
        email: agent.email,
        avatar: agent.avatar,
        contact: agent.contact,
        companyName: company.companyName
      }
    });
  } catch (error) {
    console.error('Error fetching agent data:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.post('/update-contact/:agentId', verifyAgent, async (req, res) => {
  try {
    // Log the incoming request details for debugging
    console.log('Update contact request:', {
      headers: req.headers,
      token: req.headers.authorization,
      params: req.params,
      body: req.body
    });

    const { agentId } = req.params;
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    const company = await RealEstateCompany.findOne({
      'agents._id': new mongoose.Types.ObjectId(agentId)
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }

    const agentIndex = company.agents.findIndex(
      agent => agent._id.toString() === agentId
    );

    if (agentIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }

    company.agents[agentIndex].contact = phoneNumber;
    await company.save();

    res.status(200).json({
      success: true,
      message: 'Contact updated successfully',
      contact: phoneNumber
    });
  } catch (error) {
    console.error('Error updating contact:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Add this route to handle email updates
router.post('/update-email/:agentId', verifyAgent, async (req, res) => {
  try {
    const { agentId } = req.params;
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const company = await RealEstateCompany.findOne({
      'agents._id': new mongoose.Types.ObjectId(agentId)
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }

    const agentIndex = company.agents.findIndex(
      agent => agent._id.toString() === agentId
    );

    if (agentIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }

    // Check if email is already in use by another agent
    const emailExists = company.agents.some(
      agent => agent.email === email && agent._id.toString() !== agentId
    );

    if (emailExists) {
      return res.status(400).json({
        success: false,
        message: 'Email is already in use'
      });
    }

    company.agents[agentIndex].email = email;
    await company.save();

    res.status(200).json({
      success: true,
      message: 'Email updated successfully',
      email: email
    });
  } catch (error) {
    console.error('Error updating email:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Add this route to handle agent ratings
router.post('/:agentId/rate', verifyToken, async (req, res) => {
  try {
    const { agentId } = req.params;
    const { rating, userId } = req.body;

    console.log('Rating request:', {
      agentId,
      rating,
      userId,
      user: req.user
    });

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Invalid rating value'
      });
    }

    // Find company containing this agent
    const company = await RealEstateCompany.findOne({
      'agents._id': agentId
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }

    // Find the agent
    const agent = company.agents.find(a => 
      a._id.toString() === agentId
    );

    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }

    // Check if user has already rated
    if (agent.ratedBy && agent.ratedBy.includes(userId)) {
      return res.status(400).json({
        success: false,
        message: 'You have already rated this agent'
      });
    }

    // Add rating
    if (!agent.ratings) agent.ratings = [];
    if (!agent.ratedBy) agent.ratedBy = [];

    agent.ratings.push(rating);
    agent.ratedBy.push(userId);

    // Calculate average rating
    agent.averageRating = agent.ratings.reduce((a, b) => a + b, 0) / agent.ratings.length;

    // Save changes
    await company.save();

    // Update company rating
    company.updateCompanyRating();
    await company.save();

    res.status(200).json({
      success: true,
      message: 'Rating submitted successfully',
      newRating: agent.averageRating
    });

  } catch (error) {
    console.error('Error rating agent:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Add this route to check if user has already rated an agent
router.get('/check-rating/:agentId', verifyAgent, async (req, res) => {
  try {
    const { agentId } = req.params;
    const userId = req.user.id;

    const company = await RealEstateCompany.findOne({
      'agents._id': new mongoose.Types.ObjectId(agentId)
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }

    const agent = company.agents.id(agentId);
    
    // Check if this user has already rated
    const hasRated = agent.ratedBy?.includes(userId);

    res.status(200).json({
      success: true,
      hasRated
    });
  } catch (error) {
    console.error('Error checking rating:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Temporary route to update all company ratings (remove after use)
router.post('/update-all-company-ratings', verifyAgent, async (req, res) => {
  try {
    const companies = await RealEstateCompany.find({});
    
    for (let company of companies) {
      company.updateCompanyRating();
      await company.save();
    }

    res.status(200).json({
      success: true,
      message: 'All company ratings updated'
    });
  } catch (error) {
    console.error('Error updating company ratings:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get agent listings endpoint
router.get('/listings/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;
    const token = req.headers.authorization?.split(' ')[1];

    console.log('Fetching listings for agent:', {
      agentId,
      hasToken: !!token
    });

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No authorization token provided'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Decoded token:', decoded);

    // Find the company that has this agent
    const company = await RealEstateCompany.findOne({
      'agents._id': new mongoose.Types.ObjectId(agentId)
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }

    // Find agent's listings
    const listings = await Listing.find({
      userRef: agentId,
      userModel: 'Agent'
    });

    console.log('Found listings:', {
      count: listings.length,
      agentId
    });

    return res.status(200).json({
      success: true,
      listings
    });

  } catch (error) {
    console.error('Error fetching agent listings:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error fetching listings'
    });
  }
});

// Delete listing
router.delete('/listing/:id', verifyAgent, async (req, res, next) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) {
      return next(errorHandler(404, 'Listing not found'));
    }
    
    if (listing.userRef.toString() !== req.user._id.toString()) {
      return next(errorHandler(403, 'You can only delete your own listings'));
    }

    await Listing.findByIdAndDelete(req.params.id);
    res.status(200).json({
      success: true,
      message: 'Listing deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Get agent analytics
router.get('/analytics/agent/:id', verifyAgent, async (req, res, next) => {
  try {
    const agent = await User.findById(req.params.id);
    if (!agent) {
      return next(errorHandler(404, 'Agent not found'));
    }

    const listings = await Listing.find({ userRef: req.params.id });
    
    const stats = {
      totalListings: listings.length,
      activeListings: listings.filter(listing => !listing.sold).length,
      viewsThisMonth: listings.reduce((total, listing) => total + (listing.views || 0), 0),
      inquiriesThisMonth: listings.reduce((total, listing) => total + (listing.inquiries || 0), 0)
    };

    res.status(200).json({
      success: true,
      stats
    });
  } catch (error) {
    next(error);
  }
});

// Get agent profile
router.get('/profile', verifyAgent, async (req, res, next) => {
  try {
    const agent = await User.findById(req.user._id).select('-password');
    if (!agent) {
      return next(errorHandler(404, 'Agent not found'));
    }
    res.status(200).json({
      success: true,
      agent
    });
  } catch (error) {
    next(error);
  }
});

// Add this route to fetch agent details
router.get('/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;
    console.log('Fetching agent details for:', agentId);
    console.log('Request headers:', req.headers);
    console.log('Request method:', req.method);

    // Validate agentId
    if (!mongoose.Types.ObjectId.isValid(agentId)) {
      console.log('Invalid agent ID format:', agentId);
      return res.status(400).json({
        success: false,
        message: 'Invalid agent ID format'
      });
    }

    // Find company containing this agent
    const company = await RealEstateCompany.findOne({
      'agents._id': agentId
    });

    if (!company) {
      console.log('Company not found for agent:', agentId);
      return res.status(404).json({
        success: false,
        message: 'Agent not found in any company'
      });
    }

    // Find the specific agent in the company
    const agent = company.agents.find(a => 
      a._id.toString() === agentId
    );

    if (!agent) {
      console.log('Agent not found in company:', agentId);
      return res.status(404).json({
        success: false,
        message: 'Agent details not found'
      });
    }

    // Return agent data with company info
    res.status(200).json({
      success: true,
      agent: {
        _id: agent._id,
        name: agent.name,
        email: agent.email,
        phone: agent.phone || '',
        avatar: agent.avatar || '',
        companyId: company._id,
        companyName: company.companyName,
        companyEmail: company.email || '',
        companyPhone: company.phone || '',
        companyAddress: company.address || '',
        averageRating: agent.averageRating || 0,
        ratings: agent.ratings || []
      }
    });

  } catch (error) {
    console.error('Error fetching agent details:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching agent details',
      errorDetails: error.message
    });
  }
});

export default router;
