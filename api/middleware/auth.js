import jwt from 'jsonwebtoken';
import { errorHandler } from '../utils/error.js';
import User from '../models/user.model.js';
import RealEstateCompany from '../models/realEstateCompany.model.js';
import mongoose from 'mongoose';

// Extract token from various possible sources
const extractToken = (req) => {
  // Check for token in multiple places
  const cookieToken = req.cookies?.access_token;
  const authHeader = req.headers.authorization;
  const headerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
  const queryToken = req.query?.token; // For some specific cases like WebSocket connections
  
  // Use the first available token
  const token = cookieToken || headerToken || queryToken;
  
  console.log('Token extraction:', {
    path: req.path,
    method: req.method,
    hasCookieToken: Boolean(cookieToken),
    hasHeaderToken: Boolean(headerToken),
    hasQueryToken: Boolean(queryToken),
    finalToken: token ? `${token.substring(0, 15)}...` : 'none'
  });
  
  return token;
};

export const verifyToken = async (req, res, next) => {
  try {
    // Log request details
    console.log('Token verification request:', {
      path: req.path,
      method: req.method,
      hasCookies: Boolean(req.cookies),
      hasAuthHeader: Boolean(req.headers.authorization),
      ip: req.ip,
      endpoint: `${req.method} ${req.originalUrl}`
    });

    // Extract token using the centralized function
    const token = extractToken(req);
    
    if (!token) {
      console.error('No token found in request', {
        cookies: req.cookies ? Object.keys(req.cookies) : 'none',
        authHeader: req.headers.authorization ? 'present' : 'missing',
        url: req.originalUrl
      });
      return next(errorHandler(401, 'You are not authenticated'));
    }

    let decoded;
    try {
      // Log the token being verified (first 20 chars)
      console.log('Verifying token:', {
        token: token?.substring(0, 20) + '...',
        secret: process.env.JWT_SECRET ? 'present' : 'missing'
      });

      decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Decoded token:', decoded);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return next(errorHandler(401, 'Token has expired'));
      }
      if (err.name === 'JsonWebTokenError') {
        console.error('JWT verification failed:', {
          error: err.message,
          token: token?.substring(0, 20) + '...'
        });
        return next(errorHandler(401, `Invalid token: ${err.message}`));
      }
      console.error('Token verification error:', err);
      return next(errorHandler(401, 'Invalid token'));
    }

    let user;
    let agentData;

    if (!decoded) {
      console.error('No decoded token data');
      return next(errorHandler(401, 'Token verification failed'));
    }

    console.log('Processing token data:', {
      id: decoded.id,
      isAgent: decoded.isAgent,
      companyId: decoded.companyId,
      iat: decoded.iat,
      tokenAge: decoded.iat ? `${Math.floor((Date.now() / 1000) - decoded.iat)} seconds` : 'unknown'
    });

    if (decoded.isAgent) {
      console.log('Validating agent token:', {
        id: decoded.id,
        companyId: decoded.companyId,
        isAgent: decoded.isAgent,
        tokenIssueTime: decoded.iat ? new Date(decoded.iat * 1000).toISOString() : 'unknown'
      });

      if (!decoded.id || !decoded.companyId || !decoded.isAgent) {
        console.error('Invalid agent token structure:', {
          hasId: Boolean(decoded.id),
          hasCompanyId: Boolean(decoded.companyId),
          isAgent: decoded.isAgent,
          decodedData: decoded
        });
        return next(errorHandler(401, 'Invalid agent token: missing required fields'));
      }

      // For agents, first find their company
      const company = await RealEstateCompany.findById(decoded.companyId);
      if (!company) {
        console.error('Company not found for agent:', {
          companyId: decoded.companyId,
          agentId: decoded.id,
          tokenData: decoded
        });
        return next(errorHandler(401, 'Company not found for agent. Please verify your company registration.'));
      }
      
      // Add extra validation to confirm agent belongs to this company
      const agentExists = company.agents.some(agent => 
        agent._id.toString() === decoded.id ||
        (agent.userId && agent.userId.toString() === decoded.id)
      );
      
      if (!agentExists) {
        console.error('Agent not found in specified company:', {
          companyId: company._id.toString(),
          agentId: decoded.id,
          agentCount: company.agents.length,
          path: req.path
        });
        return next(errorHandler(403, 'You are not authorized as an agent for this company'));
      }

      console.log('Found company:', {
        companyId: company._id,
        companyName: company.companyName,
        agentsCount: company.agents?.length || 0,
        hasAgentsArray: Boolean(company.agents)
      });

      // Find the agent in the company's agents array
      if (!Array.isArray(company.agents)) {
        console.error('Company agents array is invalid:', {
          companyId: company._id,
          agents: company.agents
        });
        return next(errorHandler(500, 'Invalid company data structure'));
      }

      agentData = company.agents.find(agent => agent._id.toString() === decoded.id);
      if (!agentData) {
        const agentIds = company.agents.map(a => a._id.toString());
        console.error('Agent not found in company:', {
          requestedAgentId: decoded.id,
          companyId: decoded.companyId,
          availableAgentIds: agentIds,
          agentsCount: company.agents.length
        });
        return next(errorHandler(401, 'Agent not found in company'));
      }

      console.log('Found agent:', {
        agentId: agentData._id,
        name: agentData.name,
        email: agentData.email,
        hasAvatar: Boolean(agentData.avatar),
        companyMatch: agentData.companyId?.toString() === decoded.companyId
      });

      user = {
        _id: agentData._id,
        name: agentData.name,
        email: agentData.email,
        isAgent: true,
        companyId: company._id,
        companyName: company.companyName,
        avatar: agentData.avatar,
        contact: agentData.contact
      };
    } else if (decoded.isRealEstateCompany) {
      // For real estate companies
      user = await RealEstateCompany.findById(decoded.companyId || decoded.id);
    } else {
      // For regular users
      user = await User.findById(decoded.id);
    }

    if (!user) {
      console.error('User not found for token', {
        companyId: decoded.companyId,
        id: decoded.id,
        isAgent: decoded.isAgent,
        isRealEstateCompany: decoded.isRealEstateCompany
      });
      return next(errorHandler(401, 'User not found'));
    }

    // Set user in request for downstream middleware
    req.user = user;

    console.log('Token verification successful:', {
      userId: user._id,
      isAgent: Boolean(user.isAgent),
      path: req.path
    });

    next();
  } catch (error) {
    console.error('Error in token verification:', error);
    next(errorHandler(500, 'Internal server error during authentication'));
  }
};

// Enhanced agent authentication middleware specifically for agent operations
export const agentAuth = async (req, res, next) => {
  try {
    // Extract token using centralized function
    const token = extractToken(req);
    
    if (!token) {
      console.error('No token provided for agent authentication');
      return next(errorHandler(401, 'Authentication token required'));
    }

    // Verify and decode token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      console.error('Token verification failed:', error);
      if (error.name === 'TokenExpiredError') {
        return next(errorHandler(401, 'Token has expired'));
      }
      return next(errorHandler(401, 'Invalid authentication token'));
    }

    // Validate agent-specific token data
    if (!decoded.id || !decoded.companyId || !decoded.isAgent) {
      console.error('Invalid agent token structure:', {
        hasId: Boolean(decoded.id),
        hasCompanyId: Boolean(decoded.companyId),
        isAgent: Boolean(decoded.isAgent)
      });
      return next(errorHandler(401, 'Invalid agent token structure'));
    }

    // Find the company and validate agent membership
    const company = await RealEstateCompany.findById(decoded.companyId);
    if (!company) {
      console.error('Company not found:', decoded.companyId);
      return next(errorHandler(404, 'Real estate company not found'));
    }

    // Find agent in company
    const agent = company.agents.find(a => 
      (a._id.toString() === decoded.id) || 
      (a.userId && a.userId.toString() === decoded.id)
    );

    if (!agent) {
      console.error('Agent not found in company:', {
        agentId: decoded.id,
        companyId: decoded.companyId
      });
      return next(errorHandler(403, 'Agent not found in specified company'));
    }

    // For avatar updates, ensure agent is updating their own avatar
    if (req.path.includes('/update-avatar/')) {
      const targetId = req.params.id;
      if (!mongoose.Types.ObjectId.isValid(targetId)) {
        return next(errorHandler(400, 'Invalid agent ID format'));
      }

      if (decoded.id !== targetId) {
        console.error('Unauthorized avatar update attempt:', {
          requestedId: targetId,
          agentId: decoded.id
        });
        return next(errorHandler(403, 'You can only update your own avatar'));
      }
    }

    // Set complete agent data in request
    req.user = {
      _id: agent._id,
      id: agent._id.toString(),
      name: agent.name,
      email: agent.email,
      isAgent: true,
      companyId: company._id.toString(),
      companyName: company.companyName,
      avatar: agent.avatar,
      token: token
    };

    // Log successful authentication
    console.log('Agent authenticated successfully:', {
      agentId: req.user.id,
      companyId: req.user.companyId,
      path: req.path
    });

    next();
  } catch (error) {
    console.error('Error in agentAuth middleware:', error);
    next(errorHandler(500, 'Internal server error during authentication'));
  }
};

export const verifyAgent = (req, res, next) => {
  // Use centralized token extraction
  const token = extractToken(req);
  
  // Log detailed request information
  console.log('Agent verification request:', {
    path: req.path,
    method: req.method,
    token: token ? `${token.substring(0, 15)}...` : 'missing',
    headers: req.headers,
    cookies: req.cookies
  });
  
  // Log request details
  console.log('Verify Agent Middleware - Request:', {
    path: req.path,
    method: req.method,
    params: req.params,
    token: token ? `${token.substring(0, 20)}...` : 'missing',
    headers: {
      authorization: req.headers.authorization ? `${req.headers.authorization.substring(0, 20)}...` : 'missing',
      contentType: req.headers['content-type']
    }
  });
  
  if (!token) {
    console.error('No token found in agent verification');
    return next(errorHandler(401, 'Authentication token required'));
  }
  
  // Verify token directly
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Enhanced validation of token data
    if (!decoded.id || !decoded.companyId) {
      console.error('Invalid agent token structure:', {
        hasId: Boolean(decoded.id),
        hasCompanyId: Boolean(decoded.companyId),
        decodedData: decoded
      });
      return next(errorHandler(401, 'Invalid agent token structure'));
    }
    
    console.log('Agent token decoded:', {
      id: decoded.id,
      isAgent: decoded.isAgent,
      companyId: decoded.companyId,
      tokenAge: decoded.iat ? `${Math.floor((Date.now() / 1000) - decoded.iat)} seconds` : 'unknown'
    });
    
    if (!decoded.isAgent) {
      console.error('Non-agent token used for agent route:', {
        tokenData: decoded,
        path: req.path
      });
      return next(errorHandler(403, 'You are not authorized as an agent'));
    }
    
    // Proceed with standard token verification
    verifyToken(req, res, (err) => {
      if (err) {
        console.error('Token verification failed in verifyAgent:', err);
        return next(err);
      }
        
      console.log('Verify Agent Middleware - User from verifyToken:', {
        id: req.user?.id,
        isAgent: req.user?.isAgent,
        companyId: req.user?.companyId,
        email: req.user?.email
      });
        
      if (!req.user) {
        console.error('No user object in request after verifyToken');
        return next(errorHandler(401, 'Authentication required'));
      }
        
      if (!req.user.isAgent) {
        console.error('User is not an agent after verifyToken:', {
          userId: req.user.id,
          isAgent: req.user.isAgent,
          tokenData: decoded
        });
        return next(errorHandler(403, 'You are not authorized as an agent'));
      }

      // For avatar updates, verify the agent is updating their own avatar
      if (req.path.includes('/update-avatar/')) {
        const agentId = req.params.id;
        const userId = req.user._id || req.user.id; // Handle both _id and id fields
        
        console.log('Avatar update verification:', {
          requestedId: agentId,
          userId: userId,
          userIdType: typeof userId,
          agentIdType: typeof agentId,
          match: userId.toString() === agentId.toString()
        });
        
        // Compare IDs as strings to handle ObjectId vs String comparisons
        if (userId.toString() !== agentId.toString()) {
          return next(errorHandler(403, 'You can only update your own avatar'));
        }
      }

      // Add complete agent info to the request
      const userId = req.user._id || req.user.id;
      req.agent = {
        id: userId,
        _id: userId, // Include both id and _id for consistency
        companyId: req.user.companyId,
        email: req.user.email,
        token: token, // Use the verified token
        companyName: req.user.companyName,
        isAgent: true, // Explicitly set agent flag
        avatar: req.user.avatar // Include avatar for convenience
      };
      
      // Ensure user object has complete agent data
      req.user = {
        ...req.user,
        isAgent: true,
        _id: userId,
        id: userId
      };

      // Validate agent data is complete
      if (!req.agent.id || !req.agent.companyId || !req.agent.token) {
        console.error('Incomplete agent data:', {
          hasId: Boolean(req.agent.id),
          hasCompanyId: Boolean(req.agent.companyId),
          hasToken: Boolean(req.agent.token),
          path: req.path,
          method: req.method
        });
        
        // Check if token exists in other request parts
        const cookieToken = req.cookies?.access_token;
        if (cookieToken && !req.agent.token) {
          console.log('Using cookie token as fallback');
          req.agent.token = cookieToken;
        }
        
        // Final check after attempting recovery
        if (!req.agent.id || !req.agent.companyId || !req.agent.token) {
          return next(errorHandler(401, 'Invalid agent authentication data'));
        } else {
          console.log('Recovered agent data successfully');
        }
      }

      console.log('Agent verification successful:', {
        agentId: req.agent.id,
        companyId: req.agent.companyId
      });

      next();
    });
  } catch (error) {
    console.error('Unexpected error in verifyAgent:', error);
    return next(error);
  }
};

export const verifyUser = (req, res, next) => {
  verifyToken(req, res, (err) => {
    try {
      if (err) return next(err);

      console.log('Verify User Middleware:', {
        userId: req.user?.id,
        requestedId: req.params.id,
        path: req.path,
        method: req.method
      });

      if (!req.user) {
        console.error('No user object in request');
        return next(errorHandler(401, 'Authentication required'));
      }

      if (req.user.id !== req.params.id) {
        console.error('User ID mismatch:', {
          userId: req.user.id,
          requestedId: req.params.id
        });
        return next(errorHandler(403, 'You can only access your own resources'));
      }

      next();
    } catch (error) {
      console.error('Error in verifyUser:', {
        error: error.message,
        stack: error.stack,
        path: req.path,
        method: req.method
      });
      next(error);
    }
  });
};

// Generate token for user
export const generateToken = (user) => {
  const token = jwt.sign(
    { id: user._id, name: user.name, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
  return token;
};