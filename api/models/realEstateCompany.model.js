import mongoose from "mongoose";

// Schema for an agent
const agentSchema = new mongoose.Schema({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    auto: true
  },
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  avatar: {
    type: String,
    default: "default-avatar.png"
  },
  contact: {
    type: String,
  },
  specialization: {
    type: String,
  },
  averageRating: {
    type: Number,
    default: 0
  },
  ratings: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    category: {
      type: String,
      enum: ['professionalism', 'responsiveness', 'knowledge', 'helpfulness', 'overall']
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  }],
  ratedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  categoryRatings: {
    type: Object,
    default: {
      professionalism: { averageRating: 0, totalRatings: 0 },
      responsiveness: { averageRating: 0, totalRatings: 0 },
      knowledge: { averageRating: 0, totalRatings: 0 },
      helpfulness: { averageRating: 0, totalRatings: 0 }
    }
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
    },
    categoryRatings: {
      type: Object,
      default: {
        professionalism: { averageRating: 0, totalRatings: 0 },
        responsiveness: { averageRating: 0, totalRatings: 0 },
        knowledge: { averageRating: 0, totalRatings: 0 },
        helpfulness: { averageRating: 0, totalRatings: 0 }
      }
    }
  },
  { timestamps: true }
);

// Method to update company rating
realEstateCompanySchema.methods.updateCompanyRating = function() {
  if (this.agents && this.agents.length > 0) {
    // Only consider agents who have been rated
    const ratedAgents = this.agents.filter(agent => agent.averageRating > 0);
    
    if (ratedAgents.length > 0) {
      // Calculate overall rating from all agents' ratings
      const totalRating = ratedAgents.reduce((sum, agent) => sum + agent.averageRating, 0);
      this.companyRating = Number((totalRating / ratedAgents.length).toFixed(1));

      // Calculate category ratings
      const categories = {
        professionalism: { total: 0, count: 0 },
        responsiveness: { total: 0, count: 0 },
        knowledge: { total: 0, count: 0 },
        helpfulness: { total: 0, count: 0 }
      };

      // Sum up all category ratings from agents
      ratedAgents.forEach(agent => {
        if (agent.categoryRatings) {
          Object.entries(agent.categoryRatings).forEach(([category, data]) => {
            if (data.averageRating > 0) {
              categories[category].total += data.averageRating;
              categories[category].count++;
            }
          });
        }
      });

      // Calculate averages for each category
      this.categoryRatings = {};
      Object.entries(categories).forEach(([category, data]) => {
        this.categoryRatings[category] = {
          averageRating: data.count > 0 ? Number((data.total / data.count).toFixed(1)) : 0,
          totalRatings: data.count
        };
      });
    } else {
      this.companyRating = 0;
      this.categoryRatings = {
        professionalism: { averageRating: 0, totalRatings: 0 },
        responsiveness: { averageRating: 0, totalRatings: 0 },
        knowledge: { averageRating: 0, totalRatings: 0 },
        helpfulness: { averageRating: 0, totalRatings: 0 }
      };
    }
  } else {
    this.companyRating = 0;
    this.categoryRatings = {
      professionalism: { averageRating: 0, totalRatings: 0 },
      responsiveness: { averageRating: 0, totalRatings: 0 },
      knowledge: { averageRating: 0, totalRatings: 0 },
      helpfulness: { averageRating: 0, totalRatings: 0 }
    };
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
