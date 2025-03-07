import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import bcryptjs from 'bcryptjs';
import { verifyToken, verifyAgent, agentAuth } from '../middleware/auth.js';
import RealEstateCompany from '../models/realEstateCompany.model.js';
import { agentSignin, agentSignup } from '../controllers/auth.controller.js';
import Listing from '../models/listing.model.js';
import User from '../models/user.model.js';
import { errorHandler } from '../utils/error.js';

const router = express.Router();

// Test route for token validation
router.get('/test-token', (req, res) => {
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY3YzhiMTZlOTAzNjJmYzFkNjc2NzU2ZCIsImNvbXBhbnlJZCI6IjY3NjdjNWEyZDM3OTI4NjQwMzBhZjJiZSIsImlzQWdlbnQiOnRydWUsImlhdCI6MTcwOTc2MDI4NH0.9QgXtEFMlRVMYPGBBjDfQGhH4zKwNX9J9Q4J4zKwNX9';
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Test token decoded successfully:', decoded);
    res.json({ success: true, decoded });
  } catch (error) {
    console.error('Test token verification failed:', error);
    res.status(401).json({
      success: false,
      message: `Token verification failed: ${error.message}`,
      error: error
    });
  }
});

// Token verification endpoint with enhanced validation
router.get('/verify', (req, res) => {
  const authHeader = req.headers.authorization;
  console.log('Verify request:', {
    hasAuthHeader: Boolean(authHeader),
    authType: authHeader?.split(' ')[0],
    hasToken: Boolean(authHeader?.split(' ')[1])
  });
  
  // Check for Authorization header
  if (!authHeader) {
    return res.status(401).json({
      success: false,
      message: 'No Authorization header provided'
    });
  }

  // Check for Bearer scheme
  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer') {
    return res.status(401).json({
      success: false,
      message: 'Invalid authentication scheme. Use Bearer token.'
    });
  }
  
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'No token provided in Authorization header'
    });
  }

  try {
    // Verify and decode token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Validate required fields for agent tokens
    if (decoded.isAgent) {
      if (!decoded.id || !decoded.companyId) {
        return res.status(401).json({
          success: false,
          message: 'Invalid agent token structure',
          details: 'Token is missing required fields (id or companyId)'
        });
      }
    }

    console.log('Token verified successfully:', {
      id: decoded.id,
      isAgent: decoded.isAgent,
      companyId: decoded.companyId,
      tokenAge: decoded.iat ? `${Math.floor((Date.now() / 1000) - decoded.iat)} seconds` : 'unknown'
    });
    
    res.status(200).json({ 
      success: true,
      decoded: {
        id: decoded.id,
        isAgent: decoded.isAgent,
        companyId: decoded.companyId,
        email: decoded.email,
        name: decoded.name,
        iat: decoded.iat,
        exp: decoded.exp
      }
    });
  } catch (error) {
    console.error('Token verification failed:', {
      error: error.message,
      name: error.name,
      tokenPreview: token.substring(0, 20) + '...'
    });

    // Provide specific error messages based on the error type
    let message = 'Invalid token';
    if (error.name === 'TokenExpiredError') {
      message = 'Token has expired';
    } else if (error.name === 'JsonWebTokenError') {
      message = `Token validation failed: ${error.message}`;
    }

    res.status(401).json({
      success: false,
      message,
      error: error.message
    });
  }
});

// Auth routes with detailed logging and validation
// Test route for token generation
router.get('/generate-test-token', (req, res) => {
  try {
    const tokenData = {
      id: '67c8b16e90362fc1d676756d',
      companyId: '6767c5a2d3792864030af2be',
      isAgent: true,
      email: 'test@example.com',
      name: 'Test Agent'
    };

    const token = jwt.sign(tokenData, process.env.JWT_SECRET);
    console.log('Generated test token:', {
      token: token.substring(0, 20) + '...',
      data: tokenData
    });

    res.json({
      success: true,
      token,
      data: tokenData
    });
  } catch (error) {
    console.error('Error generating test token:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate test token',
      error: error.message
    });
  }
});

// Update agent avatar
router.post('/update-avatar/:id', agentAuth, async (req, res, next) => {
  const { id } = req.params; // Define id from request parameters
  // Immediately log complete request context
  console.log('Avatar update request context:', {
    params: req.params,
    body: {
      ...req.body,
      companyId: req.body.companyId,
      avatar: req.body.avatar ? 'present' : 'missing'
    },
    user: {
      id: req.user?.id,
      isAgent: req.user?.isAgent,
      companyId: req.user?.companyId
    },
    agent: req.agent,
    headers: {
      contentType: req.headers['content-type'],
      authorization: req.headers.authorization ? 'present (Bearer)' : 'missing'
    }
  });
  try {
    const { avatar, companyId } = req.body;

    // Enhanced request logging with complete agent data
    console.log('Avatar update request:', {
      agentId: id,
      companyId,
      hasAvatar: Boolean(avatar)
    });

    // Proceed with avatar update logic
    const company = await RealEstateCompany.findById(companyId);
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    const agent = company.agents.find(a => a._id.toString() === id);
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found in company'
      });
    }

    agent.avatar = avatar;
    await company.save();

    console.log('Avatar updated successfully:', {
      agentId: id,
      companyId,
      avatarUpdated: Boolean(agent.avatar)
    });

    const token = jwt.sign({
      id: agent._id.toString(),
      companyId: company._id.toString(),
      isAgent: true
    }, process.env.JWT_SECRET, { expiresIn: '24h' });

    return res.status(200).json({
      success: true,
      message: 'Avatar updated successfully',
      agent: {
        _id: agent._id,
        id: agent._id.toString(),
        name: agent.name,
        email: agent.email,
        avatar: agent.avatar,
        companyId: company._id.toString(),
        companyName: company.companyName
      },
      token
    });
  } catch (error) {
    // Get authentication details from request for debugging
    const authHeader = req.headers.authorization;
    const cookieToken = req.cookies?.access_token;
    
    console.error('Error in avatar update:', {
      error: error.message,
      stack: error.stack,
      phase: error.message.includes('ObjectId') ? 'validation' :
            error.message.includes('company') ? 'company_update' :
            error.message.includes('user') ? 'user_update' :
            error.message.includes('not authenticated') ? 'authentication' :
            error.message.includes('authorized') ? 'authorization' : 'unknown',
      metadata: {
        agentId: id,
        companyId,
        hasAvatar: Boolean(avatar),
        requestInfo: {
          hasAuthHeader: Boolean(authHeader),
          authType: authHeader?.split(' ')[0] || 'none',
          hasCookieToken: Boolean(cookieToken),
          hasUserObj: Boolean(req.user),
          isUserAgent: req.user?.isAgent
        }
      }
    });

    // Return appropriate error response with helpful guidance
    const status = error.message.includes('not found') ? 404 :
                   error.message.includes('Invalid') ? 400 :
                   error.message.includes('not authenticated') ? 401 :
                   error.message.includes('authorized') ? 403 : 500;

    const guidance = status === 401 ? 'Please try signing out and signing back in to refresh your session.' :
                    status === 403 ? 'Please verify you are signed in with an agent account and have proper permissions.' :
                    status === 404 ? 'The requested resource could not be found. Please verify your information and try again.' :
                    'If this error persists, please contact support.';

    return res.status(status).json({
      success: false,
      message: error.message || 'Error updating avatar',
      guidance,
      details: {
        hasToken: Boolean(authHeader || cookieToken),
        isAuthenticated: Boolean(req.user),
        isAgent: Boolean(req.user?.isAgent)
      }
    });
  }
});

router.post('/agent-signin', async (req, res, next) => {
  console.log('Agent signin attempt:', {
    companyName: req.body.companyName,
    email: req.body.email
  });
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
    let company;
    try {
      company = await RealEstateCompany.findOne({ 
        companyName: { $regex: new RegExp(companyName, 'i') }
      });

      if (!company) {
        console.log('Company not found:', { companyName });
        return res.status(404).json({
          success: false,
          message: 'Company not found'
        });
      }

      console.log('Found company:', {
        id: company._id,
        name: company.companyName,
        agentsCount: company.agents?.length || 0
      });
    } catch (error) {
      console.error('Error finding company:', error);
      return res.status(500).json({
        success: false,
        message: 'Error finding company'
      });
    }

    // Find the agent within the company
    const agent = company.agents.find(a => a.email.toLowerCase() === email.toLowerCase());
    if (!agent) {
      console.log('Agent not found:', {
        email,
        companyId: company._id,
        availableEmails: company.agents.map(a => a.email)
      });
      return res.status(404).json({
        success: false,
        message: 'Agent not found in this company'
      });
    }

    console.log('Found agent:', {
      id: agent._id,
      name: agent.name,
      email: agent.email,
      hasAvatar: Boolean(agent.avatar)
    });

    // Verify password
    const validPassword = await bcryptjs.compare(password, agent.password);
    if (!validPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate token with complete agent data and expiration
    const tokenData = { 
      id: agent._id.toString(),
      companyId: company._id.toString(),
      isAgent: true,
      email: agent.email,
      name: agent.name
    };

    console.log('Generating token with data:', {
      ...tokenData,
      id: `${tokenData.id.substring(0, 10)}...`,
      companyId: `${tokenData.companyId.substring(0, 10)}...`
    });

    const token = jwt.sign(tokenData, process.env.JWT_SECRET, { expiresIn: '24h' });

    // Prepare complete agent response data
    const agentData = {
      _id: agent._id,
      id: agent._id.toString(),
      name: agent.name,
      email: agent.email,
      avatar: agent.avatar,
      contact: agent.contact,
      companyId: company._id.toString(), // Ensure it's a string for consistent comparisons
      companyName: company.companyName,
      isAgent: true
    };

    console.log('Agent signin successful:', {
      agentId: agentData.id,
      companyId: agentData.companyId,
      hasAvatar: Boolean(agentData.avatar),
      tokenPreview: `${token.substring(0, 15)}...`
    });

    // Store token in both cookie and localStorage
    res.cookie('access_token', token, { 
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    // Return complete response with agent data and token
    return res.status(200).json({
      success: true,
      agent: agentData,
      token
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

    // Generate token with isAgent flag and expiration
    const token = jwt.sign({ 
      id: newUser._id,
      isAgent: true,
      companyId: company._id 
    }, process.env.JWT_SECRET, { expiresIn: '24h' }); // Set token to expire in 24 hours

    const agentResponse = {
      success: true,
      token,
      agent: {
        _id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        avatar: newUser.avatar,
        isAgent: true,
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

router.post('/update-avatar', verifyToken, async (req, res) => {
  try {
    console.log('Update avatar request:', {
      body: req.body,
      user: req.user,
      headers: {
        ...req.headers,
        authorization: req.headers.authorization ? 'Bearer [REDACTED]' : undefined
      },
      cookies: req.cookies
    });

    const { avatar, agentId } = req.body;

    if (!avatar) {
      return res.status(400).json({
        success: false,
        message: 'Avatar URL is required'
      });
    }

    // First, ensure the user exists and is an agent
    const agent = await User.findById(agentId);
    if (!agent) {
      console.error('Agent not found:', { agentId });
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }

    console.log('Found agent:', {
      id: agent._id,
      isAgent: agent.isAgent,
      companyId: agent.realEstateCompany
    });

    // Verify the agent is updating their own avatar
    if (agentId !== req.user.id.toString()) {
      console.error('Agent ID mismatch:', {
        requestedId: agentId,
        userId: req.user.id
      });
      return res.status(403).json({
        success: false,
        message: 'You can only update your own avatar'
      });
    }

    // Ensure isAgent is set to true and update avatar
    const updatedAgent = await User.findByIdAndUpdate(
      agentId,
      { 
        $set: { 
          avatar,
          isAgent: true // Ensure isAgent is set
        } 
      },
      { new: true }
    );

    if (!updatedAgent) {
      console.error('Failed to update agent:', { agentId });
      return res.status(500).json({
        success: false,
        message: 'Failed to update agent'
      });
    }

    console.log('Avatar updated successfully:', {
      agentId,
      newAvatar: avatar,
      isAgent: updatedAgent.isAgent
    });

    res.status(200).json({
      success: true,
      message: 'Avatar updated successfully',
      avatar: updatedAgent.avatar
    });
  } catch (error) {
    console.error('Error updating avatar:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating avatar'
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

// Add route for updating agent name
router.post('/update-name/:agentId', verifyAgent, async (req, res) => {
  try {
    const { agentId } = req.params;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Name is required'
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

    company.agents[agentIndex].name = name;
    await company.save();

    res.status(200).json({
      success: true,
      message: 'Name updated successfully',
      name: name
    });
  } catch (error) {
    console.error('Error updating name:', error);
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

// Get agent data including ratings
router.get('/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;

    // Find company containing this agent
    const company = await RealEstateCompany.findOne({
      'agents._id': new mongoose.Types.ObjectId(agentId)
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }

    // Find the agent in the company
    const agent = company.agents.id(agentId);
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }

    // Return agent data without sensitive information
    const agentData = {
      _id: agent._id,
      name: agent.name,
      email: agent.email,
      avatar: agent.avatar,
      contact: agent.contact,
      averageRating: agent.averageRating || 0,
      totalRatings: agent.ratings?.length || 0,
      companyId: company._id,
      companyName: company.companyName
    };

    res.status(200).json({
      success: true,
      agent: agentData
    });

  } catch (error) {
    console.error('Error fetching agent data:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching agent data'
    });
  }
});

export default router;
