import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import RealEstateCompany from '../models/realestatecompany.model.js';
import { errorHandler } from '../utils/error.js';

// Create Real Estate Company
export const createRealEstateCompany = async (req, res, next) => {
  try {
    const { companyName, email, password } = req.body;

    // Check if company already exists
    const existingCompany = await RealEstateCompany.findOne({
      $or: [{ email }, { companyName }]
    });

    if (existingCompany) {
      return next(errorHandler(400, 'Company with this name or email already exists'));
    }

    // Hash the password
    const hashedPassword = await bcryptjs.hash(password, 10);

    // Create new company
    const newCompany = new RealEstateCompany({
      companyName,
      email,
      password: hashedPassword
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
    next(error);
  }
};

// Sign in Real Estate Company
export const signinRealEstateCompany = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find company by email
    const company = await RealEstateCompany.findOne({ email });
    if (!company) {
      return next(errorHandler(404, 'Company not found'));
    }

    // Check password
    const validPassword = await bcryptjs.compare(password, company.password);
    if (!validPassword) {
      return next(errorHandler(401, 'Wrong credentials'));
    }

    // Generate token
    const token = jwt.sign(
      { id: company._id, role: 'company' },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    const { password: pass, ...companyInfo } = company._doc;

    res.cookie('access_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production'
    }).status(200).json({
      success: true,
      company: companyInfo
    });
  } catch (error) {
    next(error);
  }
};

// Update Real Estate Company
export const updateRealEstateCompany = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    console.log('Updating company:', { id, updates });

    // Find company and update
    const company = await RealEstateCompany.findById(id);
    if (!company) {
      return next(errorHandler(404, 'Company not found'));
    }

    console.log('Found company:', company);

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

    console.log('Saving company with updates:', company);
    await company.save();

    // Return updated company without sensitive info
    const { password, ...rest } = company.toObject();
    console.log('Returning updated company:', rest);
    
    res.status(200).json({
      success: true,
      message: 'Company updated successfully',
      company: rest
    });
  } catch (error) {
    console.error('Error updating company:', error);
    next(error);
  }
};

// Delete Real Estate Company
export const deleteRealEstateCompany = async (req, res, next) => {
  try {
    const { id } = req.params;

    const company = await RealEstateCompany.findByIdAndDelete(id);
    if (!company) {
      return next(errorHandler(404, 'Company not found'));
    }

    res.status(200).json({
      success: true,
      message: 'Company deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Get Real Estate Company
export const getRealEstateCompany = async (req, res, next) => {
  try {
    const { id } = req.params;

    const company = await RealEstateCompany.findById(id);
    if (!company) {
      return next(errorHandler(404, 'Company not found'));
    }

    const { password, ...companyInfo } = company._doc;

    res.status(200).json({
      success: true,
      company: companyInfo
    });
  } catch (error) {
    next(error);
  }
};

// Add Agent to Company
export const addAgent = async (req, res, next) => {
  try {
    const { companyId } = req.params;
    const { name, email, password, contact } = req.body;

    const company = await RealEstateCompany.findById(companyId);
    if (!company) {
      return next(errorHandler(404, 'Company not found'));
    }

    // Check if agent with email already exists
    const agentExists = company.agents.some(agent => agent.email === email);
    if (agentExists) {
      return next(errorHandler(400, 'Agent with this email already exists'));
    }

    // Hash agent password
    const hashedPassword = await bcryptjs.hash(password, 10);

    // Create new agent
    const newAgent = {
      name,
      email,
      password: hashedPassword,
      contact
    };

    company.agents.push(newAgent);
    await company.save();

    res.status(201).json({
      success: true,
      message: 'Agent added successfully',
      agent: {
        name: newAgent.name,
        email: newAgent.email,
        contact: newAgent.contact,
        _id: newAgent._id
      }
    });
  } catch (error) {
    next(error);
  }
};

// Remove Agent from Company
export const removeAgent = async (req, res, next) => {
  try {
    const { companyId, agentId } = req.params;

    const company = await RealEstateCompany.findById(companyId);
    if (!company) {
      return next(errorHandler(404, 'Company not found'));
    }

    const agentIndex = company.agents.findIndex(
      agent => agent._id.toString() === agentId
    );

    if (agentIndex === -1) {
      return next(errorHandler(404, 'Agent not found'));
    }

    company.agents.splice(agentIndex, 1);
    await company.save();

    res.status(200).json({
      success: true,
      message: 'Agent removed successfully'
    });
  } catch (error) {
    next(error);
  }
};
