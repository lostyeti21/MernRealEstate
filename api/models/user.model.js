import mongoose from "mongoose";

// Schema for an agent
const agentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  contact: {
    type: String,
    required: true,
  },
  ratings: {
    type: [Number],
    default: [],
  },
  averageRating: {
    type: Number,
    default: 0,
  },
});

// Method to calculate and update an agent's average rating
agentSchema.methods.updateAverageRating = function () {
  const totalRatings = this.ratings.length;
  if (totalRatings > 0) {
    this.averageRating = this.ratings.reduce((sum, rating) => sum + rating, 0) / totalRatings;
  } else {
    this.averageRating = 0;
  }
};

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    avatar: {
      type: String,
      default:
        "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png",
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
    isAgent: {
      type: Boolean,
      default: false,
    },
    agentCompanyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RealEstateCompany",
      default: null,
    },
    agentDetails: {
      name: String,
      contact: String,
      email: String,
    },
    realEstateCompany: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RealEstateCompany",
      default: null,
    },
  },
  { timestamps: true }
);

// Method to calculate and update the real estate company's rating
userSchema.methods.updateCompanyRating = function () {
  if (this.realEstateCompany && this.realEstateCompany.agents.length > 0) {
    const totalRatings = this.realEstateCompany.agents.reduce(
      (sum, agent) => sum + (agent.averageRating || 0),
      0
    );
    this.realEstateCompany.companyRating =
      totalRatings / this.realEstateCompany.agents.length;
  } else {
    this.realEstateCompany.companyRating = 0;
  }
  return this.save();
};

// Method to calculate and update user's average rating
userSchema.methods.updateAverageRating = function () {
  const totalRatings = this.ratings.length;
  if (totalRatings > 0) {
    this.averageRating = this.ratings.reduce((sum, rating) => sum + rating, 0) / totalRatings;
  } else {
    this.averageRating = 0;
  }
};

// Method to add an agent to the company
userSchema.methods.addAgent = function (agent) {
  this.realEstateCompany.agents.push(agent);
  return this.save();
};

// Create the User model
const User = mongoose.model("User", userSchema);

export default User;
