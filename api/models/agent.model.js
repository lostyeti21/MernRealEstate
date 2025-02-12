import mongoose from 'mongoose';

const agentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  companyName: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  avatar: {
    type: String,
    default: "https://img.freepik.com/free-vector/user-circles-set_78370-4691.jpg"
  },
  isAgent: {
    type: Boolean,
    default: true
  },
  companyInfo: {
    address: String,
    phone: String,
    website: String,
    description: String
  },
  listings: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Listing'
  }],
  agentLicense: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'pending'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Pre-save middleware to handle password hashing if needed
agentSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

const Agent = mongoose.model('Agent', agentSchema);

export default Agent;
