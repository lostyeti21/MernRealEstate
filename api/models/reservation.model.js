import mongoose from 'mongoose';

const reservationSchema = new mongoose.Schema({
  listing: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Listing',
    required: true
  },
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  landlord: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true,
    validate: {
      validator: function(value) {
        // Ensure date is not in the past
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return value >= today;
      },
      message: 'Viewing date cannot be in the past'
    }
  },
  startTime: {
    type: String,
    required: true,
    validate: {
      validator: function(value) {
        return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(value);
      },
      message: 'Start time must be in HH:mm format'
    }
  },
  endTime: {
    type: String,
    required: true,
    validate: {
      validator: function(value) {
        return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(value);
      },
      message: 'End time must be in HH:mm format'
    }
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'completed'],
    default: 'pending'
  },
  rejectionReason: {
    type: String,
    default: null
  }
}, { 
  timestamps: true,
  toJSON: { getters: true },
  toObject: { getters: true }
});

// Add compound index for unique bookings
reservationSchema.index({ listing: 1, date: 1, startTime: 1 }, { unique: true });

// Pre-save middleware to validate time slots
reservationSchema.pre('save', function(next) {
  // Convert times to comparable format
  const start = this.startTime.split(':').map(Number);
  const end = this.endTime.split(':').map(Number);
  const startMinutes = start[0] * 60 + start[1];
  const endMinutes = end[0] * 60 + end[1];

  if (startMinutes >= endMinutes) {
    next(new Error('End time must be after start time'));
  } else {
    next();
  }
});

const Reservation = mongoose.model('Reservation', reservationSchema);

export default Reservation;
