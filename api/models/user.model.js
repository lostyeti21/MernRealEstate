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
      type: [String], // An array to store multiple phone numbers
      required: false, // Optional, but can be required if needed
      validate: {
        validator: function (numbers) {
          // Ensuring each phone number is valid
          return numbers.every((number) =>
            /^\+?[1-9]\d{1,14}$/.test(number) // Match international phone number format
          );
        },
        message: "Please enter valid phone numbers",
      },
    },
    ratings: {
      type: [Number], // Array of individual ratings
      default: [],
    },
    ratedBy: {
      type: [mongoose.Schema.Types.ObjectId], // Users who rated
      ref: "User",
      default: [],
    },
    averageRating: { type: Number, default: 0 }, // Average of all ratings
  },
  { timestamps: true }
);

// Method to calculate and update averageRating
userSchema.methods.updateAverageRating = function () {
  const totalRatings = this.ratings.length;
  if (totalRatings > 0) {
    this.averageRating = this.ratings.reduce((sum, rating) => sum + rating, 0) / totalRatings;
  } else {
    this.averageRating = 0; // Reset if no ratings
  }
  return this.save();
};

const User = mongoose.model("User", userSchema);

export default User;
