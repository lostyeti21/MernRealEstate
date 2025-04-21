import mongoose from 'mongoose';

const landlordRatingSchema = new mongoose.Schema({
  value: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  category: {
    type: String,
    required: true,
    enum: ['responseTime', 'maintenance', 'experience', 'overall']  // Using the existing landlord categories
  },
  comment: {
    type: String,
    default: ''
  },
  ratedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  ratedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  landlord: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Static method to calculate average rating for a landlord
landlordRatingSchema.statics.calculateAverageRating = async function(landlordId) {
  const result = await this.aggregate([
    {
      $match: { 
        landlord: new mongoose.Types.ObjectId(landlordId),
        category: { $ne: 'overall' } // Exclude overall from category calculations
      }
    },
    {
      $group: {
        _id: '$category',
        averageRating: { $avg: '$value' },
        totalRatings: { $sum: 1 }
      }
    }
  ]);

  // Calculate overall average across all categories
  const overallResult = await this.aggregate([
    {
      $match: {
        landlord: new mongoose.Types.ObjectId(landlordId),
        category: { $ne: 'overall' }
      }
    },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$value' },
        totalRatings: { $sum: 1 }
      }
    }
  ]);

  // Format the results
  const categoryRatings = {};
  result.forEach(item => {
    categoryRatings[item._id] = {
      averageRating: parseFloat(item.averageRating.toFixed(1)),
      totalRatings: item.totalRatings
    };
  });

  const overall = overallResult[0] || { averageRating: 0, totalRatings: 0 };

  return {
    categories: categoryRatings,
    overall: {
      averageRating: parseFloat(overall.averageRating.toFixed(1)),
      totalRatings: overall.totalRatings
    }
  };
};

// Method to check if a user has already rated a landlord
landlordRatingSchema.statics.hasUserRatedLandlord = async function(landlordId, userId) {
  const rating = await this.findOne({
    landlord: landlordId,
    ratedBy: userId
  });
  return !!rating;
};

// Create indexes for better query performance
landlordRatingSchema.index({ landlord: 1, ratedBy: 1 });
landlordRatingSchema.index({ landlord: 1, category: 1 });

const LandlordRating = mongoose.model('LandlordRating', landlordRatingSchema);

export default LandlordRating;