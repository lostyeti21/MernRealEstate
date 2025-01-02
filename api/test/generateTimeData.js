import mongoose from 'mongoose';
import dotenv from 'dotenv';
import TimeAnalytics from '../models/timeAnalytics.model.js';
import Listing from '../models/listing.model.js';

dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('Could not connect to MongoDB:', err));

// Function to generate random views (more views during business hours)
const generateRandomViews = () => {
  return Array(24).fill(0).map((_, hour) => {
    // Business hours (8 AM - 6 PM) get more views
    if (hour >= 8 && hour <= 18) {
      return Math.floor(Math.random() * 20) + 10; // 10-30 views
    } else {
      return Math.floor(Math.random() * 10); // 0-10 views
    }
  });
};

// Generate test data
const generateTestData = async () => {
  try {
    // Get all listings
    const listings = await Listing.find();
    console.log(`Found ${listings.length} listings`);

    // Generate time analytics for each listing
    for (const listing of listings) {
      const existingAnalytics = await TimeAnalytics.findOne({ 
        listingId: listing._id 
      });

      if (existingAnalytics) {
        existingAnalytics.hourlyViews = generateRandomViews();
        await existingAnalytics.save();
        console.log(`Updated time analytics for listing ${listing._id}`);
      } else {
        const timeAnalytics = new TimeAnalytics({
          listingId: listing._id,
          userId: listing.userRef,
          hourlyViews: generateRandomViews()
        });
        await timeAnalytics.save();
        console.log(`Created time analytics for listing ${listing._id}`);
      }
    }

    console.log('Test data generation complete!');
    process.exit(0);
  } catch (error) {
    console.error('Error generating test data:', error);
    process.exit(1);
  }
};

// Run the generator
generateTestData();
