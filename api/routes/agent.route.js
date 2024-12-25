import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { verifyToken } from '../utils/verifyUser.js';
import { RealEstateCompany } from '../models/realEstateCompany.model.js';

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

router.post('/update-avatar', verifyToken, async (req, res) => {
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

router.post('/update-phone', verifyToken, async (req, res) => {
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

router.get('/data/:agentId', verifyToken, async (req, res) => {
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

router.post('/update-contact/:agentId', verifyToken, async (req, res) => {
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
router.post('/update-email/:agentId', verifyToken, async (req, res) => {
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
router.post('/rate/:agentId', verifyToken, async (req, res) => {
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

    // Check if user is trying to rate themselves
    if (userId === agentId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot rate yourself'
      });
    }

    // Strict check if user has already rated
    if (agent.ratedBy?.includes(userId)) {
      return res.status(400).json({
        success: false,
        message: 'You have already rated this agent'
      });
    }

    // Add the rating and track the user
    if (!agent.ratings) agent.ratings = [];
    if (!agent.ratedBy) agent.ratedBy = [];
    
    agent.ratings.push(rating);
    agent.ratedBy.push(userId);

    // Calculate new agent average
    const newAgentAverage = agent.ratings.reduce((a, b) => a + b, 0) / agent.ratings.length;
    agent.averageRating = newAgentAverage;

    // Explicitly call the updateCompanyRating method
    company.updateCompanyRating();

    // Save the updated company document
    await company.save();

    res.status(200).json({
      success: true,
      message: 'Rating submitted successfully',
      newAgentRating: newAgentAverage,
      newCompanyRating: company.companyRating
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
router.get('/check-rating/:agentId', verifyToken, async (req, res) => {
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
router.post('/update-all-company-ratings', verifyToken, async (req, res) => {
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

// Add the default export
export default router;
