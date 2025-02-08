import express from 'express';
import { verifyToken } from '../utils/verifyUser.js';
import LandlordRating from '../models/landlordRating.model.js';
import User from '../models/user.model.js';

const router = express.Router();

// Submit a rating for a landlord
router.post('/rate-landlord', verifyToken, async (req, res) => {
  try {
    const { landlordId, ratings } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!landlordId || !ratings || !Array.isArray(ratings)) {
      return res.status(400).json({ success: false, message: 'Invalid rating data' });
    }

    // Check if landlord exists
    const landlord = await User.findById(landlordId);
    if (!landlord) {
      return res.status(404).json({ success: false, message: 'Landlord not found' });
    }

    // Check if user has already rated this landlord
    const hasRated = await LandlordRating.hasUserRatedLandlord(landlordId, userId);
    if (hasRated) {
      return res.status(400).json({ success: false, message: 'You have already rated this landlord' });
    }

    // Create rating entries for each category
    const ratingPromises = ratings.map(rating => {
      return new LandlordRating({
        value: rating.value,
        category: rating.category,
        comment: rating.comment || '',
        ratedBy: userId,
        landlord: landlordId
      }).save();
    });

    await Promise.all(ratingPromises);

    // Calculate new average ratings
    const updatedRatings = await LandlordRating.calculateAverageRating(landlordId);

    // Update user's ratings in the User model
    await User.findByIdAndUpdate(landlordId, {
      ratings: updatedRatings
    });

    res.status(200).json({
      success: true,
      message: 'Rating submitted successfully',
      ratings: updatedRatings
    });

  } catch (error) {
    console.error('Error submitting landlord rating:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting rating'
    });
  }
});

// Get ratings for a landlord
router.get('/:landlordId', async (req, res) => {
  try {
    const { landlordId } = req.params;

    // Calculate average ratings
    const ratings = await LandlordRating.calculateAverageRating(landlordId);

    res.status(200).json({
      success: true,
      ratings
    });

  } catch (error) {
    console.error('Error fetching landlord ratings:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching ratings'
    });
  }
});

// Check if user has rated a landlord
router.get('/check/:landlordId', verifyToken, async (req, res) => {
  try {
    const { landlordId } = req.params;
    const userId = req.user.id;

    const hasRated = await LandlordRating.hasUserRatedLandlord(landlordId, userId);

    res.status(200).json({
      success: true,
      hasRated
    });

  } catch (error) {
    console.error('Error checking rating status:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking rating status'
    });
  }
});

export default router;
