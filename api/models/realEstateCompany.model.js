import mongoose from "mongoose";

// Schema for an agent
const agentSchema = new mongoose.Schema({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    auto: true
  },
  name: String,
  email: String,
  password: String,
  avatar: {
    type: String,
    default: "default-avatar.png"
  },
  contact: String,
  ratings: {
    type: [Number],
    default: []
  },
  ratedBy: {
    type: [String],
    default: []
  },
  averageRating: {
    type: Number,
    default: 0
  }
});

const realEstateCompanySchema = new mongoose.Schema(
  {
    companyName: {
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
      default: "default-company-avatar.png"
    },
    banner: {
      type: String,
      default: ""
    },
    isCloudinaryBanner: {
      type: Boolean,
      default: false
    },
    isCloudinaryAvatar: {
      type: Boolean,
      default: false
    },
    agents: {
      type: [agentSchema],
      default: []
    },
    companyRating: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

// Method to update company rating
realEstateCompanySchema.methods.updateCompanyRating = function() {
  if (this.agents && this.agents.length > 0) {
    const totalRatings = this.agents.reduce((sum, agent) => sum + agent.averageRating, 0);
    this.companyRating = totalRatings / this.agents.length;
  } else {
    this.companyRating = 0;
  }
};

// Pre-save hook to update rating
realEstateCompanySchema.pre('save', function(next) {
  this.updateCompanyRating();
  next();
});

// Use mongoose.models to check if the model exists
const RealEstateCompany = mongoose.models.RealEstateCompany || mongoose.model('RealEstateCompany', realEstateCompanySchema);

export default RealEstateCompany;
