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
      type: [Number],
      default: [],
    },
    ratedBy: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "User",
      default: [],
    },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// Virtual field to compute if a user is a landlord
userSchema.virtual("isLandlord").get(async function () {
  const Listing = mongoose.model("Listing");
  const hasPosts = await Listing.exists({ userRef: this._id });
  return !!hasPosts;
});

const User = mongoose.model("User", userSchema);

export default User;
