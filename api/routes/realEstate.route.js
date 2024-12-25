import express from "express";
import { verifyToken } from "../middleware/auth.js";
import {
  signin,
  getCompanyData,
  updateCompany,
  addAgent,
  removeAgent,
  updateAgent,
  agentSignin,
  getRealEstateCompanyData,
  updateAvatar,
  getCompanyListings,
  getAgentListings,
  updateAgentAvatar,
  getAgent,
  getCompany
} from "../controllers/realEstate.controller.js";
import { RealEstateCompany } from "../models/realEstateCompany.model.js";

const router = express.Router();

// Move the companies route to the top and remove verifyToken for this public route
router.get('/companies', async (req, res) => {
  try {
    const companies = await RealEstateCompany.find({}, {
      companyName: 1,
      avatar: 1,
      companyRating: 1,
      agents: 1
    });

    res.status(200).json({
      success: true,
      companies
    });
  } catch (error) {
    console.error('Error fetching companies:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Company routes
router.post("/signin", signin);
router.get("/company-data", verifyToken, getCompanyData);
router.post("/update", verifyToken, updateCompany);
router.post("/add-agent", verifyToken, addAgent);
router.delete("/remove-agent/:agentId", verifyToken, removeAgent);
router.post("/update-agent/:agentId", verifyToken, updateAgent);
router.post("/agent-signin", agentSignin);
router.get("/company/:companyId", verifyToken, getRealEstateCompanyData);
router.post("/update-avatar", verifyToken, updateAvatar);
router.get('/company/:companyId/listings', verifyToken, getCompanyListings);
router.get('/agent/:agentId/listings', verifyToken, getAgentListings);
router.post('/update-agent-avatar', verifyToken, updateAgentAvatar);

// Agent routes
router.get('/agent/:agentId', getAgent);
router.get('/company/:companyId', getCompany);

export default router;
