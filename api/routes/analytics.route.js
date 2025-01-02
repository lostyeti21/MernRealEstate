import express from "express";
import { 
  getUserAnalytics, 
  trackAnalyticsEvent,
  getListingAnalytics 
} from "../controllers/analytics.controller.js";

const router = express.Router();

// Debug middleware
router.use((req, res, next) => {
  console.log(`Analytics API Request: ${req.method} ${req.url}`);
  console.log('Request body:', req.body);
  next();
});

// Listing analytics routes (must come before user routes to avoid conflict)
router.get("/listing/:id", getListingAnalytics);

// User analytics routes
router.get("/:id", getUserAnalytics);
router.post("/:id/track", trackAnalyticsEvent);

export default router;
