import mongoose from 'mongoose';

const tenantRatingSchema = new mongoose.Schema({
  value: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  category: {
    type: String,
    required: true,
    enum: ['communication', 'cleanliness', 'reliability', 'overall']
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
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Static method to calculate average rating for a tenant
tenantRatingSchema.statics.calculateAverageRating = async function(tenantId) {
  const result = await this.aggregate([
    {
      $match: { 
        tenant: new mongoose.Types.ObjectId(tenantId),
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

  // Get overall ratings separately
  const overallResult = await this.aggregate([
    {
      $match: { 
        tenant: new mongoose.Types.ObjectId(tenantId),
        category: 'overall'
      }
    },
    {
      $group: {
        _id: 'overall',
        averageRating: { $avg: '$value' },
        totalRatings: { $sum: 1 }
      }
    }
  ]);

  const ratings = {
    overall: {
      averageRating: 0,
      totalRatings: 0
    },
    categories: {}
  };

  // Process category ratings
  result.forEach(category => {
    ratings.categories[category._id] = {
      averageRating: Math.round(category.averageRating * 10) / 10,
      totalRatings: category.totalRatings
    };
  });

  // Process overall rating
  if (overallResult.length > 0) {
    ratings.overall = {
      averageRating: Math.round(overallResult[0].averageRating * 10) / 10,
      totalRatings: overallResult[0].totalRatings
    };
  }

  return ratings;
};

// Method to check if a user has already rated a tenant
tenantRatingSchema.statics.hasUserRatedTenant = async function(tenantId, userId) {
  const count = await this.countDocuments({
    tenant: tenantId,
    ratedBy: userId,
    category: { $ne: 'overall' } // Only check category ratings
  });
  return count > 0;
};

const TenantRating = mongoose.model('TenantRating', tenantRatingSchema);

export default TenantRating;
