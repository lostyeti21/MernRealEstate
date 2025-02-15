import jwt from 'jsonwebtoken';
import { errorHandler } from './error.js';

export const verifyToken = (req, res, next) => {
  // Get token from cookie or Authorization header
  const token = req.cookies.access_token || 
    (req.headers.authorization && req.headers.authorization.startsWith('Bearer ') 
      ? req.headers.authorization.split(' ')[1] 
      : null);

  if (!token) return next(errorHandler(401, 'Unauthorized'));

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return next(errorHandler(403, 'Forbidden'));
  }
};

export const verifySuperuser = (req, res, next) => {
  const superUserAuth = req.header('X-Super-User-Auth');
  
  if (superUserAuth !== 'ishe') {
    return next(errorHandler(401, 'Unauthorized: Superuser access required'));
  }
  
  next();
};