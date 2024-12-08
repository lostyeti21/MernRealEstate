import express from "express";
import {
  getUser,
  getUserListings,
  getLandlords,
  getTenants,
  rateLandlord,
  rateTenant,
  checkIfRated,
  updateUser,
  deleteUser,
} from "../controllers/user.controller.js";
import { verifyToken } from "../utils/verifyUser.js";

const router = express.Router();

// Public endpoints
router.get("/landlords", getLandlords);
router.get("/tenants", getTenants);
router.get("/listings/:id", getUserListings); // Get a user's listings
router.get("/:id", getUser); // Get a single user

//Protected endpoints
router.post("/rate-landlord", verifyToken, rateLandlord);
router.post("/rate-tenant", verifyToken, rateTenant);
router.get("/check-rated/:landlordId", verifyToken, checkIfRated);

// Profile management (protected)
router.post("/update/:id", verifyToken, updateUser);
router.delete("/delete/:id", verifyToken, deleteUser);


// NEW ROUTE: Get landlord data and listings
router.get("/landlord/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid userId" });
    }

    const landlord = await User.findById(userId).populate("listings"); //Important - populate listings
    if (!landlord) {
      return res.status(404).json({ error: "Landlord not found" });
    }

    res.json({ landlord, listings: landlord.listings });
  } catch (error) {
    console.error("Error fetching landlord:", error);
    res.status(500).json({ error: "Failed to fetch landlord data" });
  }
});

export default router;