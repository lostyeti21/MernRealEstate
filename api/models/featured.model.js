import mongoose from 'mongoose';

const featuredSchema = new mongoose.Schema(
  {
    listingId: {
      type: String,
      required: true,
    },
    updatedBy: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const Featured = mongoose.model('Featured', featuredSchema);

export default Featured;
