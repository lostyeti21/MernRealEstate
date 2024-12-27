import mongoose from 'mongoose';

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
      default: false,
    },
    parking: {
      type: Boolean,
      default: false,
    },
    type: {
      type: String,
      required: true,
    },
    offer: {
      type: Boolean,
      default: false,
    },
    imageUrls: {
      type: Array,
      required: true,
    },
    userRef: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'userModel'
    },
    userModel: {
      type: String,
      required: true,
      enum: ['User', 'Agent']
    },
    companyRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RealEstateCompany'
    },
    agentInfo: {
      type: {
        _id: {
          type: mongoose.Schema.Types.ObjectId,
          required: true
        },
        name: {
          type: String,
          required: true
        },
        email: {
          type: String,
          required: true
        },
        phone: {
          type: String
        },
        avatar: {
          type: String
        },
        companyName: {
          type: String,
          required: true
        },
        companyId: {
          type: mongoose.Schema.Types.ObjectId,
          required: true
        },
        companyEmail: {
          type: String
        },
        companyPhone: {
          type: String
        },
        companyAddress: {
          type: String
        }
      },
      default: null
    },
    m2: {
      type: Number,
      default: 0
    },
    backupPower: {
      type: Boolean,
      default: false
    },
    backupWaterSupply: {
      type: Boolean,
      default: false
    },
    boreholeWater: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

const Listing = mongoose.model('Listing', listingSchema);

export default Listing;
