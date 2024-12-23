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

// Add the default export
export default router;
