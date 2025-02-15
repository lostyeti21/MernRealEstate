import express from 'express';
import { verifyToken, verifySuperuser } from '../utils/verifyUser.js';
import SessionAnalytics from '../models/sessionAnalytics.model.js';

const router = express.Router();

// Record session start
router.post('/start', async (req, res) => {
  try {
    const { userId } = req.body;
    
    const session = new SessionAnalytics({
      userId,
      isRegistered: !!userId,
      sessionStart: new Date(),
      sessionEnd: new Date(), // Will be updated on session end
      duration: 0 // Will be updated on session end
    });

    await session.save();
    console.log(`New session started - ID: ${session._id}, User: ${userId || 'Anonymous'}`);
    res.status(200).json({ sessionId: session._id });
  } catch (error) {
    console.error('Error starting session:', error);
    res.status(500).json({ message: error.message });
  }
});

// Update session with page view
router.post('/page-view', async (req, res) => {
  try {
    const { sessionId, page, timeSpent } = req.body;
    
    await SessionAnalytics.findByIdAndUpdate(sessionId, {
      $push: {
        pagesViewed: {
          page,
          timeSpent: Number(timeSpent) || 0,
          timestamp: new Date()
        }
      }
    });

    console.log(`Page view recorded - Session: ${sessionId}, Page: ${page}, Time: ${timeSpent}s`);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error recording page view:', error);
    res.status(500).json({ message: error.message });
  }
});

// Record listing interaction
router.post('/listing-interaction', async (req, res) => {
  try {
    const { sessionId, listingId, timeSpent, clicked } = req.body;
    
    await SessionAnalytics.findByIdAndUpdate(sessionId, {
      $push: {
        listingInteractions: {
          listingId,
          timeSpent: Number(timeSpent) || 0,
          clicked,
          timestamp: new Date()
        }
      }
    });

    console.log(`Listing interaction recorded - Session: ${sessionId}, Listing: ${listingId}, Clicked: ${clicked}`);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error recording listing interaction:', error);
    res.status(500).json({ message: error.message });
  }
});

// End session
router.post('/end', async (req, res) => {
  try {
    const { sessionId } = req.body;
    const session = await SessionAnalytics.findById(sessionId);
    
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    const sessionEnd = new Date();
    const duration = Math.round((sessionEnd - session.sessionStart) / 1000); // Convert to seconds

    await SessionAnalytics.findByIdAndUpdate(sessionId, {
      sessionEnd,
      duration
    });

    console.log(`Session ended - ID: ${sessionId}, Duration: ${duration}s`);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error ending session:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get analytics (admin only)
router.get('/metrics', verifyToken, verifySuperuser, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const metrics = await SessionAnalytics.calculateMetrics(
      new Date(startDate || Date.now() - 30 * 24 * 60 * 60 * 1000),
      new Date(endDate || Date.now())
    );

    // If we don't have enough real data, use hardcoded data
    const hasRealData = metrics && metrics.totalSessions > 10;
    
    const hardcodedData = {
      totalSessions: 1250,
      avgSessionDuration: 720, // 12 minutes in seconds
      avgListingTimeSpent: 300, // 5 minutes in seconds
      totalListingClicks: 4500,
      registeredUsers: 36,
      unregisteredUsers: 20,
      userRatio: 0.64, // 36 / (36 + 20)
      peakTrafficHours: [
        { hour: 14, count: 180 }, // 2 PM
        { hour: 19, count: 165 }, // 7 PM
        { hour: 20, count: 150 }, // 8 PM
        { hour: 13, count: 145 }, // 1 PM
        { hour: 21, count: 140 }  // 9 PM
      ]
    };

    // Ensure all numeric values are valid numbers
    const responseData = hasRealData ? {
      totalSessions: Number(metrics.totalSessions) || 0,
      avgSessionDuration: Number(metrics.avgSessionDuration) || 0,
      avgListingTimeSpent: Number(metrics.avgListingTimeSpent) || 0,
      totalListingClicks: Number(metrics.totalListingClicks) || 0,
      registeredUsers: Number(metrics.registeredUsers) || 0,
      unregisteredUsers: Number(metrics.unregisteredUsers) || 0,
      userRatio: Number(metrics.userRatio) || 0,
      peakTrafficHours: metrics.peakTrafficHours || []
    } : {
      ...hardcodedData,
      isHardcodedData: true
    };

    console.log('Analytics response:', responseData);
    res.status(200).json(responseData);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
