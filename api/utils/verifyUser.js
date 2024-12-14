import jwt from "jsonwebtoken";
import { errorHandler } from "./error.js";

export const verifyToken = (req, res, next) => {
  try {
    // Extract token from cookies or Authorization header
    const token =
      req.cookies?.access_token ||
      (req.headers.authorization && req.headers.authorization.split(" ")[1]);

    if (!token) {
      console.warn("Authentication token is missing.");
      return next(errorHandler(401, "Authentication token is missing."));
    }

    // Verify the token
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        console.error("Token verification error:", err.message);
        return next(errorHandler(403, "Invalid or expired token."));
      }

      // Attach decoded user to the request object
      req.user = user;

      console.log("Token verified. User authenticated:", user);
      next();
    });
  } catch (error) {
    console.error("Unexpected error in verifyToken middleware:", error.message);
    next(errorHandler(500, "Internal server error in authentication middleware."));
  }
};