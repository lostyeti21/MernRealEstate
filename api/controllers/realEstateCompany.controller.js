import RealEstateCompany from "../models/realEstateCompany.model.js";
import User from "../models/user.model.js";
import { errorHandler } from "../utils/error.js";

// Add linked accounts
export const addLinkedAccounts = async (req, res, next) => {
  try {
    const { companyName, accounts } = req.body;

    if (!companyName || !Array.isArray(accounts) || accounts.length === 0) {
      return next(errorHandler(400, "Company name and accounts are required."));
    }

    const company = await RealEstateCompany.findOne({ companyName });
    if (!company) {
      return next(errorHandler(404, "Real estate company not found."));
    }

    const accountPromises = accounts.map(async (account) => {
      const existingUser = await User.findOne({ email: account.email });
      if (existingUser) {
        return null; // Skip existing users
      }

      const newUser = new User({
        username: account.username,
        email: account.email,
        password: account.password,
        realEstateCompany: companyName,
      });

      return newUser.save();
    });

    const addedAccounts = (await Promise.all(accountPromises)).filter((acc) => acc !== null);
    company.linkedAccounts.push(...addedAccounts.map((acc) => acc._id));
    await company.save();

    res.status(201).json({
      success: true,
      message: `${addedAccounts.length} accounts added successfully.`,
      addedAccounts,
    });
  } catch (err) {
    console.error("Error adding linked accounts:", err.message);
    next(errorHandler(500, "Internal server error."));
  }
};

export const getCompanyDetails = async (req, res) => {
  try {
    const { companyId } = req.params;

    // First try to find by _id
    const companyById = await RealEstateCompany.findById(companyId).select({
      companyName: 1,
      averageRating: 1,
      totalRatings: 1,
      categoryRatings: 1,
      agents: 1,
      companyEmail: 1,
      companyPhone: 1,
      companyAddress: 1,
      companyLogo: 1,
      companyDescription: 1
    });

    if (companyById) {
      return res.status(200).json({
        success: true,
        company: companyById.toObject()
      });
    }

    // If not found by _id, try to find by company name
    const companyByName = await RealEstateCompany.findOne({ 
      companyName: { $regex: new RegExp(companyId, 'i') } 
    }).select({
      companyName: 1,
      averageRating: 1,
      totalRatings: 1,
      categoryRatings: 1,
      agents: 1,
      companyEmail: 1,
      companyPhone: 1,
      companyAddress: 1,
      companyLogo: 1,
      companyDescription: 1
    });

    if (companyByName) {
      return res.status(200).json({
        success: true,
        company: companyByName.toObject()
      });
    }

    // If no company found
    return res.status(404).json({
      success: false,
      message: "Company not found",
    });
  } catch (error) {
    console.error("Error in getCompanyDetails:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

export const getAllRealEstateCompanies = async (req, res, next) => {
  try {
    const companies = await RealEstateCompany.find({}, 'companyName'); // Fetch all companies with only companyName field
    res.status(200).json({
      success: true,
      companies
    });
  } catch (error) {
    console.error('Error fetching companies:', error);
    next(errorHandler(500, 'Internal server error'));
  }
};
