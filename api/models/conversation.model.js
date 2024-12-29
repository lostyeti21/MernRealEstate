import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema({
  participants: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'participants.userModel'
    },
    userModel: {
      type: String,
      required: true,
      enum: ['User', 'Agent', 'RealEstateCompany']
    }
  }],
  listingId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Listing'
  },
  lastMessage: {
    type: String,
    default: ''
  },
  lastMessageTime: {
    type: Date,
    default: Date.now
  },
  unreadCount: {
    type: Object,
    default: {}
  }
}, { timestamps: true });

// Create indexes for better query performance
conversationSchema.index({ 'participants.userId': 1 });
conversationSchema.index({ lastMessageTime: -1 });
conversationSchema.index({ listingId: 1 });

const Conversation = mongoose.model('Conversation', conversationSchema);

export default Conversation;
