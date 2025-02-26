import mongoose from 'mongoose';

const ratingNotificationSchema = new mongoose.Schema({
  ratedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  ratedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  ratingType: {
    type: String,
    enum: ['tenant', 'landlord', 'agent'],
    required: true
  },
  ratingDetails: {
    communication: {
      type: Number,
      min: 0,
      max: 5,
      required: true
    },
    cleanliness: {
      type: Number,
      min: 0,
      max: 5,
      required: true
    },
    reliability: {
      type: Number,
      min: 0,
      max: 5,
      required: true
    },
    overall: {
      type: Number,
      min: 0,
      max: 5,
      required: true
    }
  },
  read: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

const RatingNotification = mongoose.model('RatingNotification', ratingNotificationSchema);

export default RatingNotification;
