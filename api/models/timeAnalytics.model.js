import mongoose from 'mongoose';

const timeAnalyticsSchema = new mongoose.Schema({
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
  hourlyViews: {
    type: [Number],
    default: Array(24).fill(0),
    validate: [
      {
        validator: function(arr) {
          return arr.length === 24;
        },
        message: 'Hourly views must have exactly 24 entries'
      },
      {
        validator: function(arr) {
          return arr.every(num => Number.isInteger(num) && num >= 0);
        },
        message: 'All view counts must be non-negative integers'
      }
    ]
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Compound index for efficient queries
timeAnalyticsSchema.index({ listingId: 1, userId: 1 });

const TimeAnalytics = mongoose.model('TimeAnalytics', timeAnalyticsSchema);

export default TimeAnalytics;
