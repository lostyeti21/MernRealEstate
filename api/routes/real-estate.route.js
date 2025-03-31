import express from 'express';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import RealEstateCompany from '../models/realestatecompany.model.js';
import { verifyToken } from '../middleware/auth.js';
import { 
  createRealEstateCompany, 
  signinRealEstateCompany, 
  updateRealEstateCompany, 
  deleteRealEstateCompany,
  addAgent,
  removeAgent,
  getRealEstateCompany
} from '../controllers/real-estate.controller.js';

const router = express.Router();

// Middleware to log all incoming requests
router.use((req, res, next) => {
  console.log(`Incoming ${req.method} request to ${req.path}`);
  next();
});

// Get all real estate companies
router.get('/companies', async (req, res) => {
  try {
    console.log('[DEBUG] Fetching all companies...');
    const companies = await RealEstateCompany.find({}, { companyName: 1, _id: 1 })
      .lean()
      .exec();
      
    console.log('[DEBUG] Found companies:', companies);
    
    return res.status(200).json({
      success: true,
      companies: companies || []
    });
  } catch (error) {
    console.error('[ERROR] Error in /companies route:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching companies',
      error: error.message
    });
  }
});

// Real Estate Company Sign Up endpoint
router.post('/company-signup', async (req, res) => {
  try {
    const { companyName, email, password, agents } = req.body;

    console.log('Received sign-up request:', { companyName, email, agents: agents?.length });

    // Check if company already exists
    const existingCompany = await RealEstateCompany.findOne({
      $or: [{ email }, { companyName }]
    });

    if (existingCompany) {
      return res.status(400).json({
        success: false,
        message: 'Company with this name or email already exists'
      });
    }

    // Hash the company password
    const hashedPassword = await bcryptjs.hash(password, 10);

    // Hash passwords for all agents if they exist
    const agentsWithHashedPasswords = agents ? await Promise.all(
      agents.map(async (agent) => ({
        ...agent,
        password: await bcryptjs.hash(agent.password, 10)
      }))
    ) : [];

    // Create new company with agents
    const newCompany = new RealEstateCompany({
      companyName,
      email,
      password: hashedPassword,
      agents: agentsWithHashedPasswords
    });

    await newCompany.save();

    res.status(201).json({
      success: true,
      message: 'Company registered successfully',
      company: {
        companyName: newCompany.companyName,
        email: newCompany.email,
        _id: newCompany._id
      }
    });

  } catch (error) {
    console.error('Error in real estate sign up:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error creating company account'
    });
  }
});

// Company signin route
router.post('/signin', async (req, res) => {
  try {
    console.log('Received signin request body:', req.body);
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Find company with all fields
    const company = await RealEstateCompany.findOne({ email }).select('+banner +isCloudinaryBanner +isCloudinaryAvatar');
    console.log('Found company:', company ? {
      id: company._id,
      hasBanner: !!company.banner,
      bannerUrl: company.banner
    } : 'not found');

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    // Verify password
    const validPassword = await bcryptjs.compare(password, company.password);
    if (!validPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate token
    const token = jwt.sign(
      { 
        companyId: company._id,
        id: company._id,  // For backward compatibility
        isRealEstateCompany: true 
      },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }  // Add expiration
    );

    // Prepare safe company data including banner and avatar info
    const safeCompanyData = {
      _id: company._id,
      companyName: company.companyName,
      email: company.email,
      banner: company.banner || '',
      isCloudinaryBanner: company.isCloudinaryBanner || false,
      avatar: company.avatar || 'default-company-avatar.png',
      isCloudinaryAvatar: company.isCloudinaryAvatar || false,
      agents: company.agents.map(agent => ({
        _id: agent._id,
        name: agent.name,
        email: agent.email,
        phone: agent.phone || '',
        avatar: agent.avatar || ''
      }))
    };

    console.log('Sending signin response for company:', {
      id: company._id,
      hasBanner: !!safeCompanyData.banner,
      bannerUrl: safeCompanyData.banner
    });

    // Set cookie and send response
    res
      .cookie('access_token', token, { httpOnly: true })
      .status(200)
      .json({
        success: true,
        company: safeCompanyData,
        token
      });

  } catch (error) {
    console.error('Error in real estate signin:', error);
    res.status(500).json({
      success: false,
      message: 'Error during sign in'
    });
  }
});

// Get all agents from all companies
router.get('/company/agents', async (req, res) => {
  try {
    const { sort = 'rating', order = 'desc' } = req.query;

    console.log('Received query params:', { sort, order });

    // Find all companies and extract their agents
    const companies = await RealEstateCompany.find({});
    
    console.log('Found companies:', companies.map(c => c.companyName));

    // Flatten agents from all companies with proper ID handling
    let allAgents = [];
    companies.forEach(company => {
      // Ensure agents is an array and filter out any non-object entries
      const validAgents = Array.isArray(company.agents) 
        ? company.agents.filter(agent => agent && typeof agent === 'object')
        : [];

      // Transform agents to include company information
      const companyAgents = validAgents.map(agent => {
        // Create a new object with spread to ensure we have a clean copy
        const agentObject = { ...agent.toObject() };
        
        // Ensure _id is a string and exists
        if (agentObject._id) {
          agentObject._id = agentObject._id.toString();
        } else {
          // Generate a new ObjectId if _id is missing
          agentObject._id = new mongoose.Types.ObjectId().toString();
        }

        // Add company information
        agentObject.companyName = company.companyName;
        
        return agentObject;
      });

      allAgents.push(...companyAgents);
    });

    console.log(`Total valid agents: ${allAgents.length}`);

    // Sort agents based on query parameters
    if (sort === 'rating') {
      allAgents.sort((a, b) => {
        const ratingA = a.averageRating || 0;
        const ratingB = b.averageRating || 0;
        return order === 'desc' ? ratingB - ratingA : ratingA - ratingB;
      });
    }

    res.status(200).json({
      success: true,
      agents: allAgents
    });
  } catch (error) {
    console.error('Error fetching agents:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching agents',
      error: error.message
    });
  }
});

// Get company by ID
router.get('/company/:id', async (req, res) => {
  try {
    console.log('Fetching company with ID:', req.params.id);
    
    const company = await RealEstateCompany.findById(req.params.id)
      .select('-password')  // Exclude password
      .select('+banner +isCloudinaryBanner +isCloudinaryAvatar'); // Include these fields
    
    if (!company) {
      console.log('Company not found');
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    console.log('Found company:', {
      id: company._id,
      name: company.companyName,
      agentsCount: company.agents?.length
    });

    res.status(200).json({
      success: true,
      company: {
        _id: company._id,
        companyName: company.companyName,
        email: company.email,
        agents: company.agents,
        avatar: company.avatar,
        banner: company.banner,
        isCloudinaryAvatar: company.isCloudinaryAvatar,
        isCloudinaryBanner: company.isCloudinaryBanner,
        companyRating: company.companyRating,
        createdAt: company.createdAt,
        updatedAt: company.updatedAt
      }
    });
  } catch (error) {
    console.error('Error fetching company:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching company data'
    });
  }
});

// Get company by ID
router.get('/company/:companyId', verifyToken, async (req, res) => {
  try {
    console.log('Fetching company details for:', req.params.companyId);
    
    const company = await RealEstateCompany.findById(req.params.companyId);
    
    if (!company) {
      console.log('Company not found:', req.params.companyId);
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    // Ensure banner field exists
    const companyData = company.toObject();
    if (!companyData.banner) {
      companyData.banner = '';
    }

    console.log('Returning company data:', {
      id: companyData._id,
      banner: companyData.banner,
      hasAvatar: !!companyData.avatar,
      hasBanner: !!companyData.banner
    });

    res.status(200).json({
      success: true,
      company: companyData
    });

  } catch (error) {
    console.error('Error fetching company:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Add this route to get agent details
router.get("/agent/:agentId", async (req, res) => {
  try {
    const { agentId } = req.params;
    console.log('Fetching agent with ID:', agentId);
    
    const company = await RealEstateCompany.findOne({
      'agents._id': agentId
    });
    
    console.log('Found company:', company ? company.companyName : 'None');

    if (!company) {
      console.log('No company found for agent:', agentId);
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }

    const agent = company.agents.id(agentId);
    console.log('Found agent:', agent ? agent.name : 'None');

    res.status(200).json({
      success: true,
      agent: {
        ...agent.toObject(),
        companyId: company._id
      }
    });

  } catch (error) {
    console.error('Error in /agent/:agentId route:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching agent data'
    });
  }
});

// Update the agent rating endpoint
router.post("/agent/:agentId/rate", verifyToken, async (req, res) => {
  try {
    const { agentId } = req.params;
    const { rating } = req.body;
    const userId = req.user.id;

    console.log('Received rating request:', { agentId, rating });

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    const company = await RealEstateCompany.findOne({
      'agents._id': new mongoose.Types.ObjectId(agentId)
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }

    const agent = company.agents.id(agentId);

    // Check if user has already rated
    if (agent.ratedBy?.includes(userId)) {
      return res.status(400).json({
        success: false,
        message: 'You have already rated this agent'
      });
    }

    // Add rating and user to rated list
    if (!agent.ratings) agent.ratings = [];
    if (!agent.ratedBy) agent.ratedBy = [];
    
    agent.ratings.push(rating);
    agent.ratedBy.push(userId);

    // Calculate new average
    const sum = agent.ratings.reduce((a, b) => a + b, 0);
    agent.averageRating = sum / agent.ratings.length;

    await company.save();

    res.status(200).json({
      success: true,
      message: 'Rating submitted successfully',
      newAverageRating: agent.averageRating
    });

  } catch (error) {
    console.error('Error rating agent:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error rating agent'
    });
  }
});

// Add these routes for updating avatar and banner
router.post("/update-avatar", async (req, res) => {
  try {
    const { companyId, avatar, isCloudinary } = req.body;
    
    console.log('Received avatar update request:', { 
      companyId, 
      avatar, 
      isCloudinary,
      avatarType: typeof avatar,
      avatarLength: avatar ? avatar.length : 'N/A'
    });

    // Validate input
    if (!companyId || !avatar) {
      return res.status(400).json({
        success: false,
        message: 'Company ID and avatar are required'
      });
    }

    // Find the company
    const company = await RealEstateCompany.findById(companyId);
    
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    // Update avatar
    company.avatar = avatar;
    await company.save();

    console.log('Avatar updated successfully:', {
      companyName: company.companyName,
      newAvatarUrl: avatar
    });

    res.status(200).json({
      success: true,
      message: 'Avatar updated successfully',
      avatar: avatar
    });
  } catch (error) {
    console.error('Error updating avatar:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating avatar'
    });
  }
});

router.post("/update-banner", async (req, res) => {
  try {
    const { companyId, banner, isCloudinary } = req.body;
    
    console.log('Received banner update request:', { companyId, banner });

    const updateData = {
      banner,
      isCloudinaryBanner: isCloudinary // Add flag to track URL type
    };

    const company = await RealEstateCompany.findByIdAndUpdate(
      companyId,
      updateData,
      { new: true }
    );

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    res.status(200).json({
      success: true,
      company
    });
  } catch (error) {
    console.error('Error updating banner:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating banner'
    });
  }
});

// Add or update the agent signin route
router.post('/agent-signin', async (req, res) => {
  try {
    const { companyName, email, password } = req.body;

    console.log('Received agent signin request:', { companyName, email });

    // Validate input
    if (!companyName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide company name, email, and password'
      });
    }

    // Find company by name
    const company = await RealEstateCompany.findOne({ companyName });
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    // Find the specific agent within the company
    const agent = company.agents.find(a => a.email === email);
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found in the company'
      });
    }

    // Check agent password
    const validPassword = await bcryptjs.compare(password, agent.password);
    if (!validPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Create token
    const token = jwt.sign(
      { 
        id: agent._id, 
        role: 'agent',
        companyId: company._id,
        companyName: company.companyName,
        email: agent.email
      },
      process.env.JWT_SECRET
    );

    // Prepare agent data to return
    const { password: pass, ...agentData } = agent.toObject();

    // Send response
    res.status(200).json({
      success: true,
      token,
      agent: {
        _id: agent._id,
        name: agent.name,
        email: agent.email,
        contact: agent.contact,
        avatar: agent.avatar || null,
        companyName: company.companyName,
        companyId: company._id
      }
    });

  } catch (error) {
    console.error('Agent signin error:', error);
    
    // Ensure a proper JSON response
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
});

// Add this route to handle agent profile updates
router.post('/agent/update-profile', verifyToken, async (req, res) => {
  try {
    const { agentId, avatar, contact } = req.body;

    console.log('Received agent profile update request:', { agentId, avatar, contact });

    // Find company that has this agent
    const company = await RealEstateCompany.findOne({
      'agents._id': agentId
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }

    // Find and update the agent
    const agent = company.agents.id(agentId);
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }

    // Update fields if provided
    if (avatar) agent.avatar = avatar;
    if (contact) agent.contact = contact;

    await company.save();

    // Return updated agent data
    const updatedAgent = {
      ...agent.toObject(),
      password: undefined,
      companyId: company._id,
      companyName: company.companyName
    };

    res.status(200).json({
      success: true,
      agent: updatedAgent
    });

  } catch (error) {
    console.error('Error updating agent profile:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating agent profile'
    });
  }
});

// Add this route near the other agent routes
router.get('/agent/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;
    console.log('Fetching agent details for:', agentId);

    // Find company containing this agent
    const company = await RealEstateCompany.findOne({
      'agents._id': agentId
    });

    if (!company) {
      console.log('Company not found for agent:', agentId);
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }

    // Find the specific agent in the company
    const agent = company.agents.find(a => 
      a._id.toString() === agentId
    );

    if (!agent) {
      console.log('Agent not found in company');
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }

    // Return agent data with company info
    res.status(200).json({
      success: true,
      agent: {
        _id: agent._id,
        name: agent.name,
        email: agent.email,
        phone: agent.phone || '',
        avatar: agent.avatar || '',
        companyId: company._id,
        companyName: company.companyName,
        companyEmail: company.email || '',
        companyPhone: company.phone || '',
        companyAddress: company.address || '',
        averageRating: agent.averageRating || 0,
        ratings: agent.ratings || []
      }
    });

  } catch (error) {
    console.error('Error fetching agent:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching agent details'
    });
  }
});

// Get company details
router.get('/:companyId', async (req, res) => {
  try {
    console.log('Fetching company details for:', req.params.companyId);
    
    const company = await RealEstateCompany.findById(req.params.companyId)
      .select('-password')  // Exclude password
      .populate({
        path: 'agents',
        select: '-password', // Exclude agent passwords
      });
    
    if (!company) {
      console.log('Company not found:', req.params.companyId);
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    console.log('Found company with agents:', {
      companyId: company._id,
      agentsCount: company.agents?.length || 0
    });

    // Return company data without sensitive information
    res.status(200).json({
      success: true,
      company: {
        _id: company._id,
        companyName: company.companyName,
        email: company.email,
        phone: company.phone || '',
        address: company.address || '',
        avatar: company.avatar || '',
        companyRating: company.companyRating || 0,
        agents: company.agents?.map(agent => ({
          _id: agent._id,
          name: agent.name,
          email: agent.email,
          phone: agent.phone || '',
          avatar: agent.avatar || '',
          averageRating: agent.averageRating || 0
        })) || []
      }
    });

  } catch (error) {
    console.error('Error fetching company:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching company details'
    });
  }
});

// Update company
router.put('/company/update/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    console.log('Incoming company update request:', {
      id,
      updates,
      hasBanner: !!updates.banner,
      bannerUrl: updates.banner
    });

    // Find and update company
    const company = await RealEstateCompany.findById(id);
    
    if (!company) {
      console.log('Company not found:', id);
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    console.log('Found company before update:', {
      id: company._id,
      currentBanner: company.banner,
      isCloudinaryBanner: company.isCloudinaryBanner
    });

    // Update fields
    if (updates.banner) {
      console.log('Updating banner:', updates.banner);
      company.banner = updates.banner;
      company.isCloudinaryBanner = true;
    }
    if (updates.avatar) {
      company.avatar = updates.avatar;
      company.isCloudinaryAvatar = true;
    }
    if (updates.companyName) company.companyName = updates.companyName;
    if (updates.email) company.email = updates.email;
    if (updates.password) {
      company.password = await bcryptjs.hash(updates.password, 10);
    }

    console.log('Saving company with updates:', {
      id: company._id,
      newBanner: company.banner,
      isCloudinaryBanner: company.isCloudinaryBanner
    });

    await company.save();

    // Get updated company data
    const updatedCompany = await RealEstateCompany.findById(id);
    console.log('Company after save:', {
      id: updatedCompany._id,
      hasBanner: !!updatedCompany.banner,
      bannerUrl: updatedCompany.banner
    });

    const { password, ...rest } = updatedCompany.toObject();
    
    console.log('Sending response:', {
      success: true,
      hasBanner: !!rest.banner,
      bannerUrl: rest.banner
    });

    res.status(200).json({
      success: true,
      message: 'Company updated successfully',
      company: rest
    });
  } catch (error) {
    console.error('Error updating company:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Add Agent route
router.post('/add-agent', verifyToken, async (req, res) => {
  try {
    console.log('Received add agent request:', req.body);
    const { companyId, agent } = req.body;
    const { name, email, password, contact } = agent;

    // Validate required fields
    if (!companyId || !name || !email || !password || !contact) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    // Find the company
    const company = await RealEstateCompany.findById(companyId);
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    // Check if agent with email already exists
    const existingAgent = company.agents.find(a => a.email === email);
    if (existingAgent) {
      return res.status(400).json({
        success: false,
        message: 'An agent with this email already exists'
      });
    }

    // Hash password
    const hashedPassword = await bcryptjs.hash(password, 10);

    // Create new agent object
    const newAgent = {
      name,
      email,
      password: hashedPassword,
      contact,
      avatar: 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png',
      ratings: [],
      averageRating: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Add agent to company
    company.agents.push(newAgent);
    await company.save();

    // Get the newly added agent (exclude password)
    const addedAgent = company.agents[company.agents.length - 1];
    const agentResponse = {
      _id: addedAgent._id,
      name: addedAgent.name,
      email: addedAgent.email,
      contact: addedAgent.contact,
      avatar: addedAgent.avatar,
      ratings: addedAgent.ratings,
      averageRating: addedAgent.averageRating,
      createdAt: addedAgent.createdAt,
      updatedAt: addedAgent.updatedAt
    };

    console.log('Successfully added agent:', agentResponse);

    res.status(201).json({
      success: true,
      message: 'Agent added successfully',
      agent: agentResponse
    });

  } catch (error) {
    console.error('Error adding agent:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error adding agent'
    });
  }
});

// Real Estate Company Routes
router.post('/create', createRealEstateCompany);
router.post('/signin', signinRealEstateCompany);
router.put('/update/:id', verifyToken, updateRealEstateCompany);
router.delete('/delete/:id', verifyToken, deleteRealEstateCompany);
router.get('/:id', verifyToken, getRealEstateCompany);

// Agent Management Routes
router.post('/:companyId/agents', verifyToken, addAgent);
router.delete('/:companyId/agents/:agentId', verifyToken, removeAgent);

// Update agent password
router.put('/agent/update-password/:agentId', verifyToken, async (req, res) => {
  try {
    const { agentId } = req.params;
    const { currentPassword, newPassword } = req.body;

    // Find the company containing this agent
    const company = await RealEstateCompany.findOne({ 'agents._id': agentId });
    if (!company) {
      return res.status(404).json({ success: false, message: 'Agent not found' });
    }

    // Get the agent from the company
    const agent = company.agents.id(agentId);
    if (!agent) {
      return res.status(404).json({ success: false, message: 'Agent not found' });
    }

    // Verify current password
    const validPassword = bcryptjs.compareSync(currentPassword, agent.password);
    if (!validPassword) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedPassword = bcryptjs.hashSync(newPassword, 10);

    // Update password
    agent.password = hashedPassword;
    await company.save();

    res.status(200).json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Password update error:', error);
    res.status(500).json({ success: false, message: 'Error updating password' });
  }
});

// Admin reset agent password
router.put('/admin/reset-agent-password/:agentId', verifyToken, async (req, res) => {
  try {
    const { agentId } = req.params;
    const { newPassword } = req.body;

    // Find the company containing this agent
    const company = await RealEstateCompany.findOne({ 'agents._id': agentId });
    if (!company) {
      return res.status(404).json({ success: false, message: 'Agent not found' });
    }

    // Get the agent from the company
    const agent = company.agents.id(agentId);
    if (!agent) {
      return res.status(404).json({ success: false, message: 'Agent not found' });
    }

    // Hash new password
    const hashedPassword = bcryptjs.hashSync(newPassword, 10);

    // Update password
    agent.password = hashedPassword;
    await company.save();

    res.status(200).json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ success: false, message: 'Error resetting password' });
  }
});

export default router;