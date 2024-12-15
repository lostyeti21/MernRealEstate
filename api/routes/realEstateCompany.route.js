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

// Route to fetch company details (protected route)
router.get("/:companyId", verifyToken, getCompanyDetails);

export default router;
