import mongoose from "mongoose";

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
    bedrooms: {
      type: Number,
      required: true,
    },
    bathrooms: {
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
      required: false,
      default: []
    },
    userRef: {
      type: String,
      ref: 'User',
      required: true
    },
    userModel: {
      type: String,
      required: true,
      enum: ['User', 'RealEstateCompany', 'Agent'],
      default: 'User'
    },
    agentInfo: {
      name: String,
      email: String,
      companyName: String
    },
    views: {
      type: Number,
      default: 0, // Initialize with zero
    },
    clicks: {
      type: Number,
      default: 0, // Initialize with zero
    },
    location: {
      type: {
        lat: { type: Number },
        lng: { type: Number },
      },
      required: false, // Optional field for geographic data
    },
    m2: {
      type: Number,
      required: true, // Makes this field mandatory
      min: 0, // Ensures the value cannot be negative
    },
    backupPower: {
      type: Boolean,
      required: false, // Optional field
      default: false, // Default value is false
    },
    backupWaterSupply: {
      type: Boolean,
      required: false, // Optional field
      default: false, // Default value is false
    },
    boreholeWater: {
      type: Boolean,
      required: false, // Optional field
      default: false, // Default value is false
    },
  },
  { timestamps: true }
);

const Listing = mongoose.model("Listing", listingSchema);

export default Listing;
