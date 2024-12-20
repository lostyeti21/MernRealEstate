import jwt from "jsonwebtoken";

export const verifyToken = (req, res, next) => {
  try {
    // Extract token from cookies or Authorization header
    const token = req.cookies?.access_token || req.headers.authorization?.split(" ")[1];

    // Check if token exists
    if (!token) {
      return res.status(401).json({ success: false, message: "Authentication token is missing." });
    }

    // Verify the token
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        return res.status(403).json({ success: false, message: "Invalid or expired token." });
      }

      // Attach user information to the request
      req.user = user;
      next();
    });
  } catch (error) {
    console.error("Error in verifyToken middleware:", error.message);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};