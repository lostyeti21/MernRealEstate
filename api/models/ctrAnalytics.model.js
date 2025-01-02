import mongoose from 'mongoose';

const ctrAnalyticsSchema = new mongoose.Schema({
  listingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Listing',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  impressions: {
    type: Number,
    default: 0
  },
  clicks: {
    type: Number,
    default: 0
  },
  // Daily stats for the last 30 days
  dailyStats: [{
    date: Date,
    impressions: Number,
    clicks: Number
  }],
  // Source tracking
  sources: [{
    name: {
      type: String,
      enum: ['search', 'direct', 'featured', 'recommendation']
    },
    impressions: {
      type: Number,
      default: 0
    },
    clicks: {
      type: Number,
      default: 0
    }
  }],
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Compound index for efficient queries
ctrAnalyticsSchema.index({ listingId: 1, userId: 1 });

const CTRAnalytics = mongoose.model('CTRAnalytics', ctrAnalyticsSchema);

export default CTRAnalytics;
