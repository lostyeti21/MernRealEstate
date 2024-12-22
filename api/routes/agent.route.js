import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { verifyToken } from '../utils/verifyUser.js';
import RealEstateCompany from '../models/realEstateCompany.model.js';

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

    console.log('Update avatar request:', {
      agentId,
      avatar: avatar?.substring(0, 50) + '...'
    });

    // Find company that has this agent using the provided agent ID
    const company = await RealEstateCompany.findOne({
      'agents._id': new mongoose.Types.ObjectId(agentId)
    });

    if (!company) {
      console.log('No company found for agent ID:', agentId);
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }

    // Find the specific agent in the agents array
    const agentIndex = company.agents.findIndex(
      agent => agent._id.toString() === agentId
    );

    if (agentIndex === -1) {
      console.log('Agent not found in company:', company.companyName);
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }

    // Update the agent's avatar
    company.agents[agentIndex].avatar = avatar;
    await company.save();

    console.log('Avatar updated successfully for agent:', {
      agentId,
      agentName: company.agents[agentIndex].name,
      companyName: company.companyName
    });

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

export default router; 