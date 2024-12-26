import express from 'express';
import { RealEstateCompany } from '../models/realEstateCompany.model.js';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { verifyToken } from '../middleware/auth.js';
import mongoose from 'mongoose';

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

// Update the agent rating endpoint
router.post("/agent/:agentId/rate", verifyToken, async (req, res) => {
  try {
    const { agentId } = req.params;
    const { rating } = req.body;
    const userId = req.user.id;

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
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

    const agent = company.agents.id(agentId);

    // Check if user has already rated
    if (agent.ratedBy?.includes(userId)) {
      return res.status(400).json({
        success: false,
        message: 'You have already rated this agent'
      });
    }

    // Add rating and user to rated list
    if (!agent.ratings) agent.ratings = [];
    if (!agent.ratedBy) agent.ratedBy = [];
    
    agent.ratings.push(rating);
    agent.ratedBy.push(userId);

    // Calculate new average
    const sum = agent.ratings.reduce((a, b) => a + b, 0);
    agent.averageRating = sum / agent.ratings.length;

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