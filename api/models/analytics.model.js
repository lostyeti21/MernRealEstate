import mongoose from "mongoose";

const AnalyticsSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  clicks: { type: Number, default: 0 },
  views: { type: Number, default: 0 },
  listingsCount: { type: Number, default: 0 },
});

const AnalyticsModel = mongoose.model("Analytics", AnalyticsSchema);

export default AnalyticsModel;
