import jwt from 'jsonwebtoken';
import { errorHandler } from '../utils/error.js';
import User from '../models/user.model.js';
import RealEstateCompany from '../models/realEstateCompany.model.js';

export const verifyToken = async (req, res, next) => {
  try {
    // Check for token in both cookie and Authorization header
    let token = req.cookies.access_token;
    const authHeader = req.headers.authorization;
    
    if (!token && authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      return next(errorHandler(401, 'No authentication token provided'));
    }

    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Decoded token:', decoded);

    if (decoded.isRealEstateCompany) {
      // Find the real estate company
      const company = await RealEstateCompany.findById(decoded.companyId);
      if (!company) {
        return next(errorHandler(401, 'Company not found'));
      }

      // Add company info to request
      req.user = {
        _id: company._id,
        isRealEstateCompany: true,
        companyName: company.companyName,
        email: company.email
      };
    } else if (decoded.isAgent) {
      // Find the company that has this agent
      const company = await RealEstateCompany.findOne({
        'agents._id': decoded.id
      });

      if (!company) {
        return next(errorHandler(401, 'Agent not found'));
      }

      // Find the agent in the company's agents array
      const agent = company.agents.find(a => a._id.toString() === decoded.id);
      if (!agent) {
        return next(errorHandler(401, 'Agent not found'));
      }

      // Add agent info to request
      req.user = {
        _id: agent._id,
        companyId: company._id,
        isAgent: true,
        email: agent.email,
        name: agent.name
      };
    } else {
      // Regular user verification
      const user = await User.findById(decoded.id);
      if (!user) {
        return next(errorHandler(401, 'User not found'));
      }
      req.user = user;
    }

    next();
  } catch (error) {
    console.error('Token verification error:', error);
    next(errorHandler(401, 'Invalid token'));
  }
};

export const verifyAgent = (req, res, next) => {
  verifyToken(req, res, () => {
    if (req.user.isAgent) {
      next();
    } else {
      return next(errorHandler(403, 'You are not authorized as an agent'));
    }
  });
};

export const verifyUser = async (req, res, next) => {
  try {
    await verifyToken(req, res, async (err) => {
      if (err) return next(err);

      if (!req.user) {
        return next(errorHandler(401, 'Authentication required'));
      }

      if (req.user.id !== req.params.id && !req.user.isAdmin) {
        return next(errorHandler(403, 'Access denied'));
      }

      next();
    });
  } catch (error) {
    console.error('User Verification Error:', error);
    next(errorHandler(500, 'Error verifying user'));
  }
};