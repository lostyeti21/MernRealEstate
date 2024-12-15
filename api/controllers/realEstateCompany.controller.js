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


