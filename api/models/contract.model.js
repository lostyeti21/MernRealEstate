import mongoose from 'mongoose';

const contractSchema = new mongoose.Schema({
  property: {
    type: String,
    required: true,
  },
  landlordFirstname: {
    type: String,
    required: function() {
      // Required if agent details are not provided
      return !this.agentFirstname && !this.agentSurname;
    },
  },
  landlordSurname: {
    type: String,
    required: function() {
      // Required if agent details are not provided
      return !this.agentFirstname && !this.agentSurname;
    },
  },
  agentFirstname: {
    type: String,
    required: function() {
      // Required if landlord details are not provided
      return !this.landlordFirstname && !this.landlordSurname;
    },
  },
  agentSurname: {
    type: String,
    required: function() {
      // Required if landlord details are not provided
      return !this.landlordFirstname && !this.landlordSurname;
    },
  },
  tenantFirstname: {
    type: String,
    required: true,
  },
  tenantSurname: {
    type: String,
    required: true,
  },
  contractUrl: {
    type: String,
    required: true,
  },
  userId: {
    type: String,
    required: true,
  },
  senderName: {
    type: String,
    required: true
  },
}, { timestamps: true });

const Contract = mongoose.model('Contract', contractSchema);

export default Contract;
