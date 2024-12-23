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

const router = express.Router();

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
