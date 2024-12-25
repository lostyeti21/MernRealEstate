import express from 'express';
import { RealEstateCompany } from '../models/realEstateCompany.model.js';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Real Estate Company Sign Up endpoint
router.post('/sign-up', async (req, res) => {
  try {
    const { companyName, email, password, agents } = req.body;

    // Check if company already exists
    const existingCompany = await RealEstateCompany.findOne({
      $or: [{ email }, { companyName }]
    });

    if (existingCompany) {
      return res.status(400).json({
        success: false,
        message: 'Company with this name or email already exists'
      });
    }

    // Hash the company password
    const hashedPassword = await bcryptjs.hash(password, 10);

    // Hash passwords for all agents
    const agentsWithHashedPasswords = await Promise.all(
      agents.map(async (agent) => ({
        ...agent,
        password: await bcryptjs.hash(agent.password, 10)
      }))
    );

    // Create new company with agents
    const newCompany = new RealEstateCompany({
      companyName,
      email,
      password: hashedPassword,
      agents: agentsWithHashedPasswords
    });

    await newCompany.save();

    res.status(201).json({
      success: true,
      message: 'Company registered successfully'
    });

  } catch (error) {
    console.error('Error in real estate sign up:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating company account'
    });
  }
});

// Update the signin route
router.post('/signin', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Find company by email
    const company = await RealEstateCompany.findOne({ email });
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    // Check password
    const validPassword = await bcryptjs.compare(password, company.password);
    if (!validPassword) {
      return res.status(401).json({
        success: false,
        message: 'Wrong credentials'
      });
    }

    // Create token
    const token = jwt.sign(
      { id: company._id, role: 'realEstate' },
      process.env.JWT_SECRET
    );

    // Remove password from company object
    const { password: pass, ...companyData } = company._doc;

    // Send response
    res.status(200).json({
      success: true,
      token,
      company: companyData
    });

  } catch (error) {
    console.error('Real estate signin error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Add this route to get company data
router.get('/company/:companyId', async (req, res) => {
  try {
    const company = await RealEstateCompany.findById(req.params.companyId);
    
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    // Remove sensitive information but keep all other data
    const { password, ...companyData } = company._doc;

    res.status(200).json({
      success: true,
      company: {
        ...companyData,
        agents: company.agents.map(agent => ({
          ...agent._doc,
          password: undefined
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching company:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching company data'
    });
  }
});

// Add this route to get agent details
router.get("/agent/:agentId", async (req, res) => {
  try {
    const { agentId } = req.params;
    console.log('Fetching agent with ID:', agentId);
    
    const company = await RealEstateCompany.findOne({
      'agents._id': agentId
    });
    
    console.log('Found company:', company ? company.companyName : 'None');

    if (!company) {
      console.log('No company found for agent:', agentId);
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }

    const agent = company.agents.id(agentId);
    console.log('Found agent:', agent ? agent.name : 'None');

    res.status(200).json({
      success: true,
      agent: {
        ...agent.toObject(),
        companyId: company._id
      }
    });

  } catch (error) {
    console.error('Error in /agent/:agentId route:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Add this route to handle agent ratings
router.post("/agent/:agentId/rate", async (req, res) => {
  try {
    const { agentId } = req.params;
    const { rating, userId } = req.body;

    console.log('Received rating request:', {
      agentId,
      rating,
      userId
    });

    if (!rating || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Rating and userId are required'
      });
    }

    const company = await RealEstateCompany.findOne({
      'agents._id': agentId
    });

    if (!company) {
      console.log('Company not found for agent:', agentId);
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }

    const agent = company.agents.id(agentId);
    if (!agent) {
      console.log('Agent not found:', agentId);
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }

    console.log('Current agent ratings:', agent.ratings);
    console.log('Current agent ratedBy:', agent.ratedBy);
    
    // Check if user has already rated
    const existingRatingIndex = agent.ratedBy.indexOf(userId);
    if (existingRatingIndex !== -1) {
      // Update existing rating
      agent.ratings[existingRatingIndex] = rating;
      console.log('Updated existing rating');
    } else {
      // Add new rating
      agent.ratings.push(rating);
      agent.ratedBy.push(userId);
      console.log('Added new rating');
    }

    // Calculate new average
    const sum = agent.ratings.reduce((a, b) => a + b, 0);
    agent.averageRating = sum / agent.ratings.length;

    console.log('New average rating:', agent.averageRating);

    await company.save();

    res.status(200).json({
      success: true,
      message: 'Rating submitted successfully',
      newAverageRating: agent.averageRating
    });

  } catch (error) {
    console.error('Error rating agent:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Add these routes for updating avatar and banner
router.post("/update-avatar", async (req, res) => {
  try {
    const { companyId, avatar, isCloudinary } = req.body;
    
    const updateData = {
      avatar,
      isCloudinaryAvatar: isCloudinary // Add flag to track URL type
    };

    const company = await RealEstateCompany.findByIdAndUpdate(
      companyId,
      updateData,
      { new: true }
    );

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    res.status(200).json({
      success: true,
      company
    });
  } catch (error) {
    console.error('Error updating avatar:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.post("/update-banner", async (req, res) => {
  try {
    const { companyId, banner, isCloudinary } = req.body;
    
    const updateData = {
      banner,
      isCloudinaryBanner: isCloudinary // Add flag to track URL type
    };

    const company = await RealEstateCompany.findByIdAndUpdate(
      companyId,
      updateData,
      { new: true }
    );

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    res.status(200).json({
      success: true,
      company
    });
  } catch (error) {
    console.error('Error updating banner:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Add or update the agent signin route
router.post('/agent/signin', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Find company that has an agent with this email
    const company = await RealEstateCompany.findOne({
      'agents.email': email
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }

    // Find the agent
    const agent = company.agents.find(a => a.email === email);

    // Verify password
    const validPassword = await bcryptjs.compare(password, agent.password);
    if (!validPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Create token
    const token = jwt.sign(
      { 
        id: agent._id, 
        role: 'agent',
        companyId: company._id 
      },
      process.env.JWT_SECRET
    );

    // Remove password from agent object
    const agentWithoutPassword = {
      ...agent.toObject(),
      password: undefined,
      companyId: company._id,
      companyName: company.companyName
    };

    res.status(200).json({
      success: true,
      token,
      agent: agentWithoutPassword
    });

  } catch (error) {
    console.error('Agent signin error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Add this route to handle agent profile updates
router.post('/agent/update-profile', verifyToken, async (req, res) => {
  try {
    const { agentId, avatar, contact } = req.body;

    // Find company that has this agent
    const company = await RealEstateCompany.findOne({
      'agents._id': agentId
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }

    // Find and update the agent
    const agent = company.agents.id(agentId);
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }

    // Update fields if provided
    if (avatar) agent.avatar = avatar;
    if (contact) agent.contact = contact;

    await company.save();

    // Return updated agent data
    const updatedAgent = {
      ...agent.toObject(),
      password: undefined,
      companyId: company._id,
      companyName: company.companyName
    };

    res.status(200).json({
      success: true,
      agent: updatedAgent
    });

  } catch (error) {
    console.error('Error updating agent profile:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export default router; 