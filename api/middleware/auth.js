import jwt from 'jsonwebtoken';
import { errorHandler } from '../utils/error.js';
import User from '../models/user.model.js';
import RealEstateCompany from '../models/realEstateCompany.model.js';

export const verifyToken = async (req, res, next) => {
  try {
    const token = req.cookies.access_token;
    
    if (!token) {
      return next(errorHandler(401, 'You are not authenticated'));
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return next(errorHandler(401, 'Token has expired'));
      }
      return next(errorHandler(401, 'Invalid token'));
    }

    const user = decoded.isRealEstateCompany 
      ? await RealEstateCompany.findById(decoded.id)
      : await User.findById(decoded.id);

    if (!user) {
      return next(errorHandler(401, 'User not found'));
    }

    req.user = {
      id: user._id,
      username: user.username,
      email: user.email,
      isRealEstateCompany: decoded.isRealEstateCompany,
      isAdmin: user.isAdmin
    };

    next();
  } catch (error) {
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