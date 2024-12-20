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
    phoneNumbers: {
      type: [String],
      required: false,
    },
    ratings: {
      type: [Number],
      default: [],
    },
    ratedBy: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "User",
      default: [],
    },
    averageRating: {
      type: Number,
      default: 0,
    },
    isAdmin: {
      type: Boolean,
      default: false, // Regular users are not admins by default
    },
  },
  { timestamps: true }
);

// Method to calculate and update averageRating
userSchema.methods.updateAverageRating = function () {
  const totalRatings = this.ratings.length;
  if (totalRatings > 0) {
    this.averageRating = this.ratings.reduce((sum, rating) => sum + rating, 0) / totalRatings;
  } else {
    this.averageRating = 0;
  }
  return this.save();
};

const User = mongoose.model("User", userSchema);

export default User;
