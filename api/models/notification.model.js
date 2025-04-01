import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['viewing_request', 'system', 'message', 'rating', 'dispute_submitted', 'dispute_received', 'dispute_approved', 'dispute_rejected', 'contract_signature_required', 'contract_signed']
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
  },
  category: {
    type: String,
    enum: ['general', 'contract', 'dispute', 'rating', 'viewing'],
    default: 'general'
  }
}, {
  timestamps: true,
  toJSON: { getters: true, virtuals: true },
  toObject: { getters: true, virtuals: true }
});

notificationSchema.index({ to: 1, read: 1 });
notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ category: 1 });

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
