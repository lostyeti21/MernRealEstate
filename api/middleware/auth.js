import jwt from 'jsonwebtoken';
import { errorHandler } from '../utils/error.js';

export const verifyToken = (req, res, next) => {
  try {
    const token = req.cookies.access_token || req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

    console.log('Token verified, user:', decoded);
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
};

// Optional: Additional middleware to verify if user is a real estate company
export const verifyRealEstateCompany = (req, res, next) => {
  if (!req.user.isRealEstateCompany) {
    return next(errorHandler(403, 'Access denied - Real estate companies only'));
  }
  next();
};

// Optional: Middleware to verify token and company status in one go
export const verifyRealEstateToken = [verifyToken, verifyRealEstateCompany]; 