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
  getRealEstateCompanyData
} from "../controllers/realEstate.controller.js";

const router = express.Router();

// Public routes
router.post("/signin", signin);

// Protected routes
router.get("/company-data", verifyToken, getCompanyData);
router.post("/update-company/:id", verifyToken, updateCompany);
router.post("/add-agent", verifyToken, addAgent);
router.delete("/remove-agent/:agentId", verifyToken, removeAgent);
router.put("/update-agent/:agentId", verifyToken, updateAgent);
router.post("/agent-signin", agentSignin);
router.get("/company/:id", verifyToken, getRealEstateCompanyData);

// Add this test route
router.get("/test", (req, res) => {
  res.json({ message: "Real estate routes are working" });
});

export default router;
