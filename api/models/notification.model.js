import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  to: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['rating', 'dispute_rejected', 'dispute_approved', 'system']
  },
  read: {
    type: Boolean,
    default: false
  },
  from: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  systemInfo: {
    name: {
      type: String,
      default: 'System'
    },
    avatar: {
      type: String,
      default: '/default-avatar.png'
    }
  },
  rating: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'ratingType',
    required: false
  },
  ratingType: {
    type: String,
    enum: ['TenantRating', 'LandlordRating', null],
    required: false,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  strict: false
});

// Index for faster queries
notificationSchema.index({ to: 1, read: 1 });
notificationSchema.index({ createdAt: -1 });

// Add virtual for formatted date
notificationSchema.virtual('formattedDate').get(function() {
  return this.createdAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
});

// Ensure virtuals are included in JSON
notificationSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
