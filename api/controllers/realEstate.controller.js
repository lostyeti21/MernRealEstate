import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import RealEstateCompany from "../models/realEstateCompany.model.js";
import { errorHandler } from "../utils/error.js";
import Listing from "../models/listing.model.js";

// Sign in controller
export const signin = async (req, res, next) => {
  const { email, companyName, password } = req.body;

  try {
    console.log('Sign-in attempt:', { email, companyName }); // Debug log

    if (!email || !companyName || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required"
      });
    }

    const company = await RealEstateCompany.findOne({
      $or: [{ email }, { companyName }]
    });

    console.log('Found company:', company ? 'Yes' : 'No'); // Debug log

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found"
      });
    }

    const validPassword = bcryptjs.compareSync(password, company.password);
    console.log('Password valid:', validPassword); // Debug log

    if (!validPassword) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    const token = jwt.sign(
      { id: company._id, isRealEstateCompany: true },
      process.env.JWT_SECRET
    );

    const { password: pass, ...rest } = company._doc;
    
    res.status(200).json({
      success: true,
      token,
      company: rest
    });
  } catch (error) {
    console.error('Sign-in error:', error); // Debug log
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

// Get company data
export const getCompanyData = async (req, res, next) => {
  try {
    const company = await RealEstateCompany.findById(req.user.id);
    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found"
      });
    }

    // Get listings
    const listings = await Listing.find({
      userRef: company._id
    }).sort({ createdAt: -1 });

    const { password, ...companyData } = company._doc;
    
    return res.status(200).json({
      success: true,
      company: {
        ...companyData,
        agents: company.agents || []
      },
      listings: listings || []
    });
  } catch (error) {
    console.error("Error in getCompanyData:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

// Update company
export const updateCompany = async (req, res, next) => {
  if (req.user.id !== req.params.id) {
    return next(errorHandler(401, "You can only update your own account"));
  }

  try {
    if (req.body.password) {
      req.body.password = bcryptjs.hashSync(req.body.password, 10);
    }

    const updatedCompany = await RealEstateCompany.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          companyName: req.body.companyName,
          email: req.body.email,
          password: req.body.password,
        },
      },
      { new: true }
    );

    const { password, ...rest } = updatedCompany._doc;

    res.status(200).json({
      success: true,
      company: rest
    });
  } catch (error) {
    next(error);
  }
};

// Add agent
export const addAgent = async (req, res, next) => {
  try {
    const company = await RealEstateCompany.findById(req.user.id);
    if (!company) {
      return next(errorHandler(404, "Company not found"));
    }

    const { name, email, contact, password } = req.body;
    const hashedPassword = bcryptjs.hashSync(password, 10);

    company.agents.push({
      name,
      email,
      contact,
      password: hashedPassword
    });

    await company.save();
    
    res.status(201).json({
      success: true,
      message: "Agent added successfully"
    });
  } catch (error) {
    next(error);
  }
};

// Remove agent
export const removeAgent = async (req, res, next) => {
  try {
    const company = await RealEstateCompany.findById(req.user.id);
    if (!company) {
      return next(errorHandler(404, "Company not found"));
    }

    company.agents = company.agents.filter(
      agent => agent._id.toString() !== req.params.agentId
    );

    await company.save();
    await company.updateCompanyRating();

    res.status(200).json({
      success: true,
      message: "Agent removed successfully"
    });
  } catch (error) {
    next(error);
  }
};

// Update agent
export const updateAgent = async (req, res, next) => {
  try {
    const company = await RealEstateCompany.findById(req.user.id);
    if (!company) {
      return next(errorHandler(404, "Company not found"));
    }

    const agentIndex = company.agents.findIndex(
      agent => agent._id.toString() === req.params.agentId
    );

    if (agentIndex === -1) {
      return next(errorHandler(404, "Agent not found"));
    }

    if (req.body.password) {
      req.body.password = bcryptjs.hashSync(req.body.password, 10);
    }

    company.agents[agentIndex] = {
      ...company.agents[agentIndex],
      ...req.body
    };

    await company.save();

    res.status(200).json({
      success: true,
      message: "Agent updated successfully"
    });
  } catch (error) {
    next(error);
  }
};

export const agentSignin = async (req, res, next) => {
  try {
    const { companyName, email, password } = req.body;

    const company = await RealEstateCompany.findOne({ companyName });
    const agent = company.agents.find(a => a.email === email);

    const validPassword = bcryptjs.compareSync(password, agent.password);

    // Create token with both ID and email
    const token = jwt.sign(
      { 
        id: agent._id.toString(),
        email: agent.email,  // Include email in token
        isAgent: true
      },
      process.env.JWT_SECRET
    );

    const agentData = {
      _id: agent._id.toString(),
      name: agent.name,
      email: agent.email,
      companyName: company.companyName
    };

    res.status(200).json({
      success: true,
      token,
      agent: agentData
    });
  } catch (error) {
    next(error);
  }
};

export const getRealEstateCompanyData = async (req, res, next) => {
  try {
    const companyId = req.params.id;
    
    const company = await RealEstateCompany.findById(companyId);
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Real estate company not found'
      });
    }

    // Return only necessary data
    const companyData = {
      _id: company._id,
      companyName: company.companyName,
      email: company.email,
      avatar: company.avatar || "https://img.freepik.com/free-vector/grey-user-circles-set_78370-7045.jpg?semt=ais_hybrid",
      companyRating: company.companyRating || 0,
      agents: company.agents.map(agent => ({
        _id: agent._id,
        name: agent.name,
        email: agent.email,
        avatar: agent.avatar || "https://cdn-icons-png.flaticon.com/512/149/149071.png",
        ratings: agent.ratings || []
      }))
    };

    res.status(200).json({
      success: true,
      company: companyData
    });
  } catch (error) {
    console.error('Error getting company data:', error);
    next(error);
  }
}; 