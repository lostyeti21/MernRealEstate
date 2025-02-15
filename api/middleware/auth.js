import jwt from 'jsonwebtoken';
import { errorHandler } from '../utils/error.js';
import User from '../models/user.model.js';
import RealEstateCompany from '../models/realEstateCompany.model.js';

export const verifyToken = async (req, res, next) => {
  try {
    // Check multiple token sources
    const cookieToken = req.cookies.access_token;
    const headerToken = req.headers.authorization?.split(' ')[1];
    
    const token = cookieToken || headerToken;
    
    if (!token) {
      console.error('No token found', {
        cookies: Object.keys(req.cookies),
        headers: req.headers
      });
      return next(errorHandler(401, 'You are not authenticated'));
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Decoded token:', decoded);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return next(errorHandler(401, 'Token has expired'));
      }
      console.error('Token verification error:', err);
      return next(errorHandler(401, 'Invalid token'));
    }

    // Prioritize finding by companyId for real estate routes
    const user = decoded.isRealEstateCompany 
      ? await RealEstateCompany.findById(decoded.companyId || decoded.id)
      : await User.findById(decoded.id);

    if (!user) {
      console.error('User not found for token', {
        companyId: decoded.companyId,
        id: decoded.id,
        isRealEstateCompany: decoded.isRealEstateCompany
      });
      return next(errorHandler(401, 'User not found'));
    }

    req.user = {
      id: user._id,
      username: user.username || user.companyName,
      email: user.email,
      isRealEstateCompany: decoded.isRealEstateCompany,
      isAdmin: user.isAdmin
    };

    next();
  } catch (error) {
    console.error('Unexpected error in verifyToken:', error);
    next(error);
  }
};

export const verifyAgent = (req, res, next) => {
  verifyToken(req, res, (err) => {
    if (err) return next(err);
    if (!req.user.isAgent) {
      return next(errorHandler(403, 'You are not authorized as an agent'));
    }
    next();
  });
};

export const verifyUser = (req, res, next) => {
  verifyToken(req, res, (err) => {
    if (err) return next(err);
    if (req.user.id !== req.params.id) {
      return next(errorHandler(403, 'You can only access your own resources'));
    }
    next();
  });
};