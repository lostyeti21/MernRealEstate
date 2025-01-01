import mongoose from 'mongoose';

const codeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  code: {
    type: String,
    required: true
  },
  expiryTime: {
    type: Date,
    required: true
  }
}, { timestamps: true });

// Add TTL index to automatically delete documents after expiry
codeSchema.index({ expiryTime: 1 }, { expireAfterSeconds: 0 });

const Code = mongoose.model('Code', codeSchema);

export default Code;
