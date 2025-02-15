import mongoose from 'mongoose';

const sessionAnalyticsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Allow null for unregistered users
  },
  isRegistered: {
    type: Boolean,
    default: false
  },
  sessionStart: {
    type: Date,
    required: true
  },
  sessionEnd: {
    type: Date,
    required: true
  },
  duration: {
    type: Number, // in seconds
    required: true
  },
  pagesViewed: [{
    page: String,
    timeSpent: Number, // in seconds
    timestamp: Date
  }],
  listingInteractions: [{
    listingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Listing'
    },
    timeSpent: Number, // in seconds
    clicked: {
      type: Boolean,
      default: false
    },
    timestamp: Date
  }]
}, { timestamps: true });

// Static method to calculate analytics
sessionAnalyticsSchema.statics.calculateMetrics = async function(startDate, endDate) {
  const metrics = await this.aggregate([
    {
      $match: {
        createdAt: {
          $gte: startDate,
          $lte: endDate
        }
      }
    },
    {
      $group: {
        _id: null,
        totalSessions: { $sum: 1 },
        avgSessionDuration: { $avg: '$duration' },
        registeredUsers: { $sum: { $cond: ['$isRegistered', 1, 0] } },
        unregisteredUsers: { $sum: { $cond: ['$isRegistered', 0, 1] } },
        totalListingClicks: {
          $sum: {
            $size: {
              $filter: {
                input: '$listingInteractions',
                as: 'interaction',
                cond: '$$interaction.clicked'
              }
            }
          }
        },
        avgListingTimeSpent: {
          $avg: {
            $avg: {
              $map: {
                input: '$listingInteractions',
                as: 'interaction',
                in: '$$interaction.timeSpent'
              }
            }
          }
        }
      }
    },
    {
      $project: {
        _id: 0,
        totalSessions: 1,
        avgSessionDuration: 1,
        registeredUsers: 1,
        unregisteredUsers: 1,
        totalListingClicks: 1,
        avgListingTimeSpent: 1,
        userRatio: {
          $divide: ['$registeredUsers', { $add: ['$registeredUsers', '$unregisteredUsers'] }]
        }
      }
    }
  ]);

  // Calculate peak traffic times
  const peakTraffic = await this.aggregate([
    {
      $match: {
        createdAt: {
          $gte: startDate,
          $lte: endDate
        }
      }
    },
    {
      $group: {
        _id: { $hour: '$sessionStart' },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { count: -1 }
    },
    {
      $limit: 5
    }
  ]);

  return {
    ...(metrics[0] || {}),
    peakTrafficHours: peakTraffic.map(peak => ({
      hour: peak._id,
      count: peak.count
    }))
  };
};

const SessionAnalytics = mongoose.model('SessionAnalytics', sessionAnalyticsSchema);
export default SessionAnalytics;
