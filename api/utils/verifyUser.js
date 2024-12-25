import jwt from "jsonwebtoken";
import { errorHandler } from "./error.js";

export const verifyToken = (req, res, next) => {
  // Check for token in multiple places
  const token = req.cookies.access_token || 
                req.headers.authorization?.split(' ')[1] || 
                req.headers['x-access-token'];

  if (!token) {
    console.log('No token found in:', {
      cookies: req.cookies,
      authHeader: req.headers.authorization,
      xToken: req.headers['x-access-token']
    });
    return next(errorHandler(401, 'Authentication token is missing'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return next(errorHandler(403, 'Invalid token'));
  }
};