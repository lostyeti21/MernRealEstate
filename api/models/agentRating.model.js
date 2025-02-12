import mongoose from 'mongoose';

const agentRatingSchema = new mongoose.Schema({
  agentId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'RealEstateCompany.agents'
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  ratings: [{
    category: {
      type: String,
      required: true,
      enum: ['professionalism', 'responsiveness', 'knowledge', 'helpfulness', 'overall']
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster lookups
agentRatingSchema.index({ agentId: 1, userId: 1 }, { unique: true });

// Update the updatedAt timestamp before saving
agentRatingSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const AgentRating = mongoose.model('AgentRating', agentRatingSchema);

export default AgentRating;
