import mongoose from 'mongoose';

const searchAnalyticsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  listingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Listing',
    required: true
  },
  searchTerm: {
    type: String,
    required: true,
    trim: true
  },
  count: {
    type: Number,
    default: 1
  },
  lastSearched: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Compound index for efficient queries
searchAnalyticsSchema.index({ userId: 1, listingId: 1, searchTerm: 1 });

const SearchAnalytics = mongoose.model('SearchAnalytics', searchAnalyticsSchema);

export default SearchAnalytics;
