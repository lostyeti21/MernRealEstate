import mongoose from "mongoose";

const realEstateCompanySchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true, // Ensure each company has a unique email
    },
    proofOfCompany: {
      type: String, // File URL for proof of company
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    agents: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User", // Links to users (agents) in this company
      },
    ],
  },
  { timestamps: true }
);

const RealEstateCompany = mongoose.model("RealEstateCompany", realEstateCompanySchema);

export default RealEstateCompany;
