import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['viewing_request', 'system', 'message', 'rating', 'dispute_submitted', 'dispute_received', 'dispute_approved', 'dispute_rejected']
  },
  to: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  from: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: function() {
      return !this.type.startsWith('dispute_');
    }
  },
  content: {
    type: String,
    required: function() {
      return !this.type.startsWith('dispute_');
    }
  },
  data: {
    type: Object,
    default: {}
  },
  reservationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Reservation'
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending'
  },
  read: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { getters: true, virtuals: true },
  toObject: { getters: true, virtuals: true }
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

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
