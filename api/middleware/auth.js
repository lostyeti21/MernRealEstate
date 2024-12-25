import jwt from 'jsonwebtoken';
import { errorHandler } from '../utils/error.js';

export const verifyToken = (req, res, next) => {
  const token = req.cookies.access_token || req.headers.authorization?.split(' ')[1];

  if (!token) {
    return next(errorHandler(401, 'Authentication required'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return next(errorHandler(401, 'Invalid token'));
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