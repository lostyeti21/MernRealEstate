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
  ratings: {
    type: [Number],
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
    agents: [agentSchema],
    companyRating: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Method to calculate and update company rating
realEstateCompanySchema.methods.updateCompanyRating = function() {
  if (this.agents.length === 0) {
    this.companyRating = 0;
    return;
  }
  
  const totalRating = this.agents.reduce((sum, agent) => {
    return sum + (agent.averageRating || 0);
  }, 0);
  
  this.companyRating = totalRating / this.agents.length;
};

const RealEstateCompany = mongoose.model("RealEstateCompany", realEstateCompanySchema);

export default RealEstateCompany;
