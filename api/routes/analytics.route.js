import express from "express";
import { getUserAnalytics } from "../controllers/analytics.controller.js";

const router = express.Router();

router.get("/:id", getUserAnalytics);

export default router;
