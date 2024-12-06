import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: false,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    avatar: {
      type: String,
      default: "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png",
    },
    ratings: {
      type: [Number], // Array to store individual ratings
      default: [],
    },
    ratedBy: {
      type: [String], // Array to store user IDs who have rated this landlord
      default: [],
    },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;
