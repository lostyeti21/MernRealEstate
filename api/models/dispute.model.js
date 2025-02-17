import mongoose from 'mongoose';

const disputeSchema = new mongoose.Schema({
  rating: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'ratingType'
  },
  ratingType: {
    type: String,
    required: true,
    enum: ['tenant', 'landlord']
  },
  disputedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  ratedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'resolved', 'rejected'],
    default: 'pending'
  },
  reason: {
    type: String,
    required: true
  },
  reasonType: {
    type: String,
    required: true,
    enum: [
      'Inaccurate or unfair assessment',
      'Rating based on factors outside my control',
      'Personal bias or conflict of interest',
      'Incorrect information or misunderstanding',
      'Other'
    ]
  },
  categories: [{
    category: {
      type: String,
      required: true
    },
    value: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    }
  }],
  originalComment: String,
  resolvedAt: Date
}, { timestamps: true });

// Index for faster queries
disputeSchema.index({ status: 1, createdAt: -1 });
disputeSchema.index({ disputedBy: 1, status: 1 });
disputeSchema.index({ rating: 1 }, { unique: true });

const Dispute = mongoose.model('Dispute', disputeSchema);

export default Dispute;
