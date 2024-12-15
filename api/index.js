import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import userRouter from "./routes/user.route.js";
import authRouter from "./routes/auth.route.js";
import listingRouter from "./routes/listing.route.js";
import analyticsRouter from "./routes/analytics.route.js";
import emailRouter from "./routes/email.js"; // Import email router
import cookieParser from "cookie-parser";
import path from "path";

dotenv.config();

mongoose
  .connect(process.env.MONGO)
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.log("Error connecting to MongoDB: " + err);
  });

const __dirname = path.resolve();

const app = express();
app.use(express.json());
app.use(cookieParser());

// Serve static files for uploaded content
app.use("/uploads", express.static(path.join(__dirname, "uploads"))); // Serve uploaded files

// API Routes
app.use("/api/user", userRouter); // User routes (e.g., change password)
app.use("/api/auth", authRouter); // Authentication routes (e.g., sign in, sign up)
app.use("/api/listing", listingRouter); // Listing-related routes
app.use("/api/analytics", analyticsRouter); // Analytics routes
app.use("/api/email", emailRouter); // Dedicated email routes for password reset and other notifications

// Serve static files from client build
app.use(express.static(path.join(__dirname, "/client/dist")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "client", "dist", "index.html"));
});

// Global Error Handler
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  console.error("Error: ", message);
  return res.status(statusCode).json({
    success: false,
    statusCode,
    message,
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
