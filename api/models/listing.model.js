import mongoose from 'mongoose';

const viewingTimeSchema = new mongoose.Schema({
  available: {
    type: Boolean,
    default: false
  },
  start: {
    type: String,
    default: "09:00"
  },
  end: {
    type: String,
    default: "17:00"
  }
}, { _id: false });

const listingSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    regularPrice: {
      type: Number,
      required: true,
    },
    discountPrice: {
      type: Number,
      required: true,
    },
    bathrooms: {
      type: Number,
      required: true,
    },
    bedrooms: {
      type: Number,
      required: true,
    },
    furnished: {
      type: Boolean,
      required: true,
    },
    parking: {
      type: Boolean,
      required: true,
    },
    type: {
      type: String,
      required: true,
    },
    offer: {
      type: Boolean,
      required: true,
    },
    imageUrls: {
      type: Array,
      required: true,
    },
    userRef: {
      type: String,
      required: true,
    },
    userModel: {
      type: String,
      enum: ['User', 'Agent'],
      required: true,
    },
    apartmentType: {
      type: String,
      required: true,
      enum: [
        'House', 
        'Flat/Apartment', 
        'Cluster', 
        'Cottage', 
        'Garden Flat', 
        'Townhouse/Complex/Cluster/Cottage/Garden Flat', 
        'Stand', 
        'Room'
      ],
      default: 'House'
    },
    interestedUsers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    m2: {
      type: Number,
      required: true,
    },
    backupPower: {
      type: Boolean,
      required: true,
    },
    backupWaterSupply: {
      type: Boolean,
      required: true,
    },
    boreholeWater: {
      type: Boolean,
      required: true,
    },
    lounges: {
      type: Number,
      required: true,
      default: 1,
      min: 0
    },
    electricFence: {
      type: Boolean,
      required: true,
      default: false
    },
    walledOrFenced: {
      type: Boolean,
      required: true,
      default: false
    },
    electricGate: {
      type: Boolean,
      required: true,
      default: false
    },
    builtInCupboards: {
      type: Boolean,
      required: true,
      default: false
    },
    fittedKitchen: {
      type: Boolean,
      required: true,
      default: false
    },
    solarGeyser: {
      type: Boolean,
      required: true,
      default: false
    },
    viewingSchedule: {
      monday: viewingTimeSchema,
      tuesday: viewingTimeSchema,
      wednesday: viewingTimeSchema,
      thursday: viewingTimeSchema,
      friday: viewingTimeSchema,
      saturday: viewingTimeSchema,
      sunday: viewingTimeSchema
    },
    flexibleViewingTime: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

const Listing = mongoose.model('Listing', listingSchema);

export default Listing;
