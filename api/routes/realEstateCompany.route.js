import express from "express";
import { verifyToken } from "../utils/verifyToken.js"; // Middleware for authentication
import {
  createCompanyAccount,
  addLinkedAccounts,
  getCompanyDetails,
} from "../controllers/realEstateCompany.controller.js";

const router = express.Router();

// Route to create a new real estate company account
router.post("/create", createCompanyAccount);

// Route to add linked accounts (protected route)
router.post("/add-linked-accounts", verifyToken, addLinkedAccounts);

// Public route to fetch company details
router.get("/:companyId", getCompanyDetails);

export default router;
