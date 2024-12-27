import mongoose from 'mongoose';
import RealEstateCompany from '../api/models/realestatecompany.model.js';

mongoose.connect('mongodb://localhost:27017/mern-estate').then(async () => {
  console.log('Connected to MongoDB');
  
  try {
    // Update all companies to ensure they have the banner field
    const result = await RealEstateCompany.updateMany(
      { banner: { $exists: false } },
      { $set: { banner: '', isCloudinaryBanner: false } }
    );
    
    console.log('Update result:', result);
    
    // Get all companies to verify
    const companies = await RealEstateCompany.find({});
    console.log('Companies after update:', companies.map(c => ({
      id: c._id,
      banner: c.banner,
      isCloudinaryBanner: c.isCloudinaryBanner
    })));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.disconnect();
  }
});
