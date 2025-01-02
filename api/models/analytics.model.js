import mongoose from "mongoose";

const ListingAnalyticsSchema = new mongoose.Schema({
  listingId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Listing", 
    required: true 
  },
  views: { 
    type: Number, 
    default: 0 
  },
  clicks: { 
    type: Number, 
    default: 0 
  },
  inquiries: { 
    type: Number, 
    default: 0 
  },
  lastUpdated: { 
    type: Date, 
    default: Date.now 
  }
});

const AnalyticsSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  clicks: { 
    type: Number, 
    default: 0 
  },
  views: { 
    type: Number, 
    default: 0 
  },
  listingsCount: { 
    type: Number, 
    default: 0 
  },
  listingAnalytics: [ListingAnalyticsSchema],
  lastUpdated: { 
    type: Date, 
    default: Date.now 
  }
});

// Update lastUpdated on save
AnalyticsSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  if (this.isModified('listingAnalytics')) {
    for (const listingStats of this.listingAnalytics) {
      listingStats.lastUpdated = new Date();
    }
  }
  next();
});

const AnalyticsModel = mongoose.model("Analytics", AnalyticsSchema);

export default AnalyticsModel;
