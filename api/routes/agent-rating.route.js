import express from 'express';
import mongoose from 'mongoose';
import RealEstateCompany from '../models/realestatecompany.model.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Utility function to validate and sanitize rating data
const validateRatingData = (ratings, userId) => {
  console.log('Validating rating data:', { ratings, userId });

  // Validate input
  if (!Array.isArray(ratings)) {
    console.error('Ratings must be an array');
    throw new Error('Ratings must be an array');
  }

  // Ensure userId is a valid ObjectId
  let userObjectId;
  try {
    userObjectId = new mongoose.Types.ObjectId(userId);
  } catch (error) {
    console.error('Invalid userId:', userId);
    throw new Error('Invalid user ID');
  }

  // Convert and validate each rating
  const processedRatings = ratings
    .filter(({ category }) => category !== 'overall')
    .map(({ category, rating }) => {
      // Validate category
      const validCategories = ['professionalism', 'responsiveness', 'knowledge', 'helpfulness'];
      if (!validCategories.includes(category)) {
        console.error('Invalid rating category:', category);
        throw new Error(`Invalid rating category: ${category}`);
      }

      // Validate rating
      const numRating = Number(rating);
      if (isNaN(numRating) || numRating < 1 || numRating > 5) {
        console.error('Invalid rating value:', rating);
        throw new Error('Rating must be a number between 1 and 5');
      }

      // Construct rating object with all required fields
      const ratingObject = {
        userId: userObjectId,
        rating: numRating,
        category,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Log each rating object for debugging
      console.log('Processed rating object:', ratingObject);

      return ratingObject;
    });

  console.log('Final processed ratings:', processedRatings);
  return processedRatings;
};

// Get agent ratings
router.get('/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;
    console.log('Fetching ratings for agent:', agentId);

    // Find company that has this agent
    const company = await RealEstateCompany.findOne({
      'agents._id': agentId
    });

    if (!company) {
      console.log('Company not found for agent:', agentId);
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }

    // Find the agent in the company's agents array
    const agent = company.agents.find(a => a._id.toString() === agentId);

    if (!agent) {
      console.log('Agent not found in company:', agentId);
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }

    console.log('Found agent ratings:', {
      averageRating: agent.averageRating,
      totalRatings: agent.ratedBy?.length,
      categories: agent.categoryRatings
    });

    // Calculate category ratings
    const categoryRatings = {
      knowledge: { total: 0, count: 0 },
      professionalism: { total: 0, count: 0 },
      responsiveness: { total: 0, count: 0 },
      helpfulness: { total: 0, count: 0 }
    };

    // Process all ratings
    if (agent.ratings && Array.isArray(agent.ratings)) {
      agent.ratings.forEach(rating => {
        if (rating.category && rating.rating) {
          if (categoryRatings[rating.category]) {
            categoryRatings[rating.category].total += rating.rating;
            categoryRatings[rating.category].count++;
          }
        }
      });
    }

    // Convert totals to averages
    const processedCategories = {};
    Object.entries(categoryRatings).forEach(([category, data]) => {
      processedCategories[category] = {
        averageRating: data.count > 0 ? data.total / data.count : 0,
        totalRatings: data.count
      };
    });

    res.status(200).json({
      success: true,
      ratings: {
        overall: {
          averageRating: agent.averageRating || 0,
          totalRatings: agent.ratings?.length || 0
        },
        categories: processedCategories
      }
    });
  } catch (error) {
    console.error('Error fetching agent ratings:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching agent ratings'
    });
  }
});

// Rate an agent with multiple ratings
router.post('/:agentId/rate', verifyToken, async (req, res) => {
  try {
    const { agentId } = req.params;
    const { ratings } = req.body;
    const userId = req.user.id;

    console.log('Received rating request:', {
      agentId,
      userId,
      ratings
    });

    // Validate and process ratings
    const processedRatings = validateRatingData(ratings, userId);

    // Find company and update only the specific agent's ratings
    const company = await RealEstateCompany.findOne({ 'agents._id': agentId });
    if (!company) {
      console.error('Company not found for agent:', agentId);
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }

    // Find the agent
    const agent = company.agents.find(a => a._id.toString() === agentId);
    if (!agent) {
      console.error('Agent not found in company');
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }

    // Initialize or get existing ratings array
    const existingRatings = agent.ratings || [];
    
    // Remove any previous ratings by this user
    const filteredRatings = existingRatings.filter(r => r.userId.toString() !== userId);
    
    // Add new ratings
    const updatedRatings = [...filteredRatings, ...processedRatings];

    // Update the agent's ratings in the database
    const finalUpdate = await RealEstateCompany.findOneAndUpdate(
      { 'agents._id': agentId },
      {
        $set: {
          'agents.$[agent].ratings': updatedRatings,
          'agents.$[agent].ratedBy': [...new Set([...agent.ratedBy.map(id => id.toString()), userId])].map(id => new mongoose.Types.ObjectId(id))
        }
      },
      {
        arrayFilters: [{ 'agent._id': new mongoose.Types.ObjectId(agentId) }],
        new: true,
        runValidators: true
      }
    );

    if (!finalUpdate) {
      throw new Error('Failed to update agent ratings');
    }

    // Find the updated agent
    const updatedAgent = finalUpdate.agents.find(a => a._id.toString() === agentId);
    
    // Calculate category ratings for the agent
    const categories = {
      professionalism: { total: 0, count: 0 },
      responsiveness: { total: 0, count: 0 },
      knowledge: { total: 0, count: 0 },
      helpfulness: { total: 0, count: 0 }
    };

    // Calculate ratings for each category from all ratings
    updatedAgent.ratings.forEach(r => {
      if (categories[r.category]) {
        categories[r.category].total += r.rating;
        categories[r.category].count++;
      }
    });

    // Update category ratings
    const categoryRatings = {};
    Object.entries(categories).forEach(([category, data]) => {
      categoryRatings[category] = {
        averageRating: data.count > 0 ? Number((data.total / data.count).toFixed(1)) : 0,
        totalRatings: data.count
      };
    });

    // Calculate overall rating from category averages
    const validCategoryRatings = Object.values(categoryRatings)
      .filter(cat => cat.totalRatings > 0);
    
    const totalRating = validCategoryRatings.reduce((sum, cat) => sum + cat.averageRating, 0);
    const averageRating = validCategoryRatings.length > 0 
      ? Number((totalRating / validCategoryRatings.length).toFixed(1)) 
      : 0;

    // Update the agent's final ratings
    const finalAgentUpdate = await RealEstateCompany.findOneAndUpdate(
      { 'agents._id': agentId },
      {
        $set: {
          'agents.$[agent].categoryRatings': categoryRatings,
          'agents.$[agent].averageRating': averageRating
        }
      },
      {
        arrayFilters: [{ 'agent._id': new mongoose.Types.ObjectId(agentId) }],
        new: true,
        runValidators: true
      }
    );

    if (!finalAgentUpdate) {
      throw new Error('Failed to update agent ratings');
    }

    // Update company's overall rating
    await finalAgentUpdate.updateCompanyRating();
    await finalAgentUpdate.save();

    // Find the final updated agent
    const finalAgent = finalAgentUpdate.agents.find(a => a._id.toString() === agentId);

    // Return updated ratings
    const response = {
      success: true,
      message: 'Ratings submitted successfully',
      ratings: {
        overall: {
          averageRating: finalAgent.averageRating,
          totalRatings: finalAgent.ratedBy.length
        },
        categories: finalAgent.categoryRatings,
        companyRating: finalAgentUpdate.companyRating
      }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Unexpected error in rating submission:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting ratings',
      error: error.message
    });
  }
});

export default router;
