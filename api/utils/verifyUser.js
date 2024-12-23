import jwt from "jsonwebtoken";
import { errorHandler } from "./error.js";

export const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1] || 
                req.cookies.access_token || 
                req.headers['x-access-token'];

  if (!token) {
    return next(errorHandler(401, 'Authentication token is missing'));
  }

  try {
    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    
    // Add user type to request
    if (decoded.isAgent) {
      req.userType = 'agent';
    } else {
      req.userType = 'user';
    }
    
    next();
  } catch (error) {
    return next(errorHandler(403, 'Invalid token'));
  }
};