import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/user.model.js";
import dotenv from "dotenv";

dotenv.config();

const createSuperuser = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const existingAdmin = await User.findOne({ email: "admin@example.com" });
    if (existingAdmin) {
      console.log("Superuser already exists.");
      process.exit();
    }

    const hashedPassword = await bcrypt.hash("adminpassword", 10);

    const adminUser = new User({
      username: "Admin",
      email: "admin@example.com",
      password: hashedPassword,
      isAdmin: true, // This should be in your user model schema
    });

    await adminUser.save();
    console.log("Superuser created successfully!");
    process.exit();
  } catch (error) {
    console.error("Error creating superuser:", error);
    process.exit(1);
  }
};

createSuperuser();
