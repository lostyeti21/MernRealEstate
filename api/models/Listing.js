import mongoose from 'mongoose';

const ViewingScheduleSchema = new mongoose.Schema({
  monday: {
    available: { type: Boolean, default: false },
    start: { type: String, default: '09:00' },
    end: { type: String, default: '17:00' },
  },
  tuesday: {
    available: { type: Boolean, default: false },
    start: { type: String, default: '09:00' },
    end: { type: String, default: '17:00' },
  },
  wednesday: {
    available: { type: Boolean, default: false },
    start: { type: String, default: '09:00' },
    end: { type: String, default: '17:00' },
  },
  thursday: {
    available: { type: Boolean, default: false },
    start: { type: String, default: '09:00' },
    end: { type: String, default: '17:00' },
  },
  friday: {
    available: { type: Boolean, default: false },
    start: { type: String, default: '09:00' },
    end: { type: String, default: '17:00' },
  },
  saturday: {
    available: { type: Boolean, default: false },
    start: { type: String, default: '09:00' },
    end: { type: String, default: '17:00' },
  },
  sunday: {
    available: { type: Boolean, default: false },
    start: { type: String, default: '09:00' },
    end: { type: String, default: '17:00' },
  },
}, { _id: false });

const ListingSchema = new mongoose.Schema({
  imageUrls: [String],
  name: { type: String, required: true },
  description: { type: String, default: '' },
  address: { type: String, required: true },
  type: { type: String, enum: ['rent', 'sale'], default: 'rent' },
  bedrooms: { type: Number, default: 1 },
  bathrooms: { type: Number, default: 1 },
  regularPrice: { type: Number, required: true },
  discountPrice: { type: Number, default: 0 },
  offer: { type: Boolean, default: false },
  parking: { type: Boolean, default: false },
  furnished: { type: Boolean, default: false },
  m2: { type: Number, default: 0 },
  backupPower: { type: Boolean, default: false },
  backupWaterSupply: { type: Boolean, default: false },
  boreholeWater: { type: Boolean, default: false },
  apartmentType: { type: String, default: 'House' },
  lounges: { type: Number, default: 1 },
  electricFence: { type: Boolean, default: false },
  walledOrFenced: { type: Boolean, default: false },
  electricGate: { type: Boolean, default: false },
  builtInCupboards: { type: Boolean, default: false },
  fittedKitchen: { type: Boolean, default: false },
  solarGeyser: { type: Boolean, default: false },
  gym: { type: Boolean, default: false },
  pool: { type: Boolean, default: false },
  garden: { type: Boolean, default: false },
  balcony: { type: Boolean, default: false },
  airConditioning: { type: Boolean, default: false },
  wifi: { type: Boolean, default: false },
  leaseAgreement: { type: String, default: '' },
  leaseAgreementUrl: { type: String, default: '' },
  viewingSchedule: { type: ViewingScheduleSchema, default: () => ({}) },
  flexibleViewingTime: { type: Boolean, default: false },
  userRef: { type: mongoose.Schema.Types.ObjectId, refPath: 'userModel', required: true },
  userModel: { type: String, required: true, enum: ['User', 'Agent'] },
  agentInfo: {
    _id: { type: mongoose.Schema.Types.ObjectId, ref: 'Agent' },
    name: String,
    email: String,
    phone: String,
    avatar: String,
    companyName: String,
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'RealEstateCompany' },
    companyEmail: String,
    companyPhone: String,
    companyAddress: String
  },
}, { timestamps: true });

export default mongoose.model('Listing', ListingSchema);
