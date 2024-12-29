import jwt from 'jsonwebtoken';
import { errorHandler } from '../utils/error.js';
import User from '../models/user.model.js';
import RealEstateCompany from '../models/realEstateCompany.model.js';

export const verifyToken = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.'
      });
    }

    // Check if user exists
    const user = decoded.isRealEstateCompany 
      ? await RealEstateCompany.findById(decoded.id)
      : await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found.'
      });
    }

    // Add user to request
    req.user = {
      id: user._id.toString(),
      isRealEstateCompany: decoded.isRealEstateCompany,
      isAgent: decoded.isAgent
    };
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
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