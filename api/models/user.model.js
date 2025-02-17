import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const ratingSchema = new mongoose.Schema({
  value: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  category: {
    type: String,
    required: true,
    enum: ['responseTime', 'maintenance', 'experience']
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
  read: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
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
    default: "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png"
  },
  phoneNumbers: [{
    type: String,
    validate: {
      validator: function(v) {
        return /^\+?[\d\s-]+$/.test(v);
      },
      message: props => `${props.value} is not a valid phone number!`
    }
  }],
  ratings: [ratingSchema],
  ratedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  verificationCode: String,
  resetToken: {
    type: String,
    default: null
  },
  resetTokenExpiry: {
    type: Date,
    default: null
  },
  isAdmin: {
    type: Boolean,
    default: false,
  },
  isAgent: {
    type: Boolean,
    default: false,
  },
  isRealEstateCompany: {
    type: Boolean,
    default: false,
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'agent', 'landlord', 'tenant'],
    default: 'user'
  }
}, { 
  timestamps: true 
});

// Method to get rating details
userSchema.methods.getRatingDetails = function() {
  // Ensure ratings array exists and is valid
  const ratings = Array.isArray(this.ratings) ? this.ratings : [];
  
  // Initialize rating categories
  const ratingsByCategory = {
    responseTime: [],
    maintenance: [],
    experience: []
  };

  let totalRatings = 0;
  let sumRatings = 0;

  // Process each valid rating
  ratings.forEach(rating => {
    if (rating && rating.category && rating.value && rating.category in ratingsByCategory) {
      ratingsByCategory[rating.category].push(rating.value);
      sumRatings += rating.value;
      totalRatings++;
    }
  });

  // Helper function to safely calculate average
  const calculateAverage = arr => {
    if (!Array.isArray(arr) || arr.length === 0) return 0;
    const sum = arr.reduce((a, b) => a + b, 0);
    return Number((sum / arr.length).toFixed(1));
  };

  // Return formatted rating details
  return {
    overall: {
      averageRating: totalRatings ? Number((sumRatings / totalRatings).toFixed(1)) : 0,
      totalRatings
    },
    categories: {
      responseTime: calculateAverage(ratingsByCategory.responseTime),
      maintenance: calculateAverage(ratingsByCategory.maintenance),
      experience: calculateAverage(ratingsByCategory.experience)
    }
  };
};

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

const User = mongoose.model('User', userSchema);

export default User;
