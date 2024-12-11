import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Resolve __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicitly load .env file
dotenv.config({ path: path.resolve(__dirname, ".env") });

console.log("Testing MongoDB URI:", process.env.MONGO);

const testConnection = async () => {
  try {
    await mongoose.connect(process.env.MONGO, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log("Connected to MongoDB successfully!");
    mongoose.disconnect();
  } catch (error) {
    console.error("Error connecting to MongoDB:", error.message);
  }
};

testConnection();
