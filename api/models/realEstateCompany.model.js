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
    isCloudinaryAvatar: {
      type: Boolean,
      default: false
    },
    agents: [agentSchema],
    companyRating: {
      type: Number,
      default: 0,
    },
    banner: {
      type: String,
      default: ""
    },
    isCloudinaryBanner: {
      type: Boolean,
      default: false
    },
  },
  { timestamps: true }
);

// Method to calculate and update company rating
realEstateCompanySchema.methods.updateCompanyRating = function() {
  const ratedAgents = this.agents.filter(agent => 
    agent.ratings && agent.ratings.length > 0
  );
  
  if (ratedAgents.length === 0) {
    this.companyRating = 0;
    return;
  }
  
  const totalRating = ratedAgents.reduce((sum, agent) => {
    return sum + agent.averageRating;
  }, 0);
  
  this.companyRating = totalRating / ratedAgents.length;
};

// Add this before creating the model
realEstateCompanySchema.pre('save', function(next) {
  this.updateCompanyRating();
  next();
});

export const RealEstateCompany = mongoose.model("RealEstateCompany", realEstateCompanySchema);
