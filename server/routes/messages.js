const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const auth = require('../middleware/auth');

// Get all messages
router.get('/', auth, async (req, res) => {
  try {
    const messages = await Message.find()
      .populate({
        path: 'sender',
        select: 'username avatar'
      })
      .populate({
        path: 'receiver',
        select: 'username avatar'
      })
      .sort({ createdAt: -1 })
      .limit(10);
    res.json({ messages });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});

// Get messages for a specific conversation
router.get('/conversation/:conversationId', auth, async (req, res) => {
  try {
    const messages = await Message.find({ conversationId: req.params.conversationId })
      .populate({
        path: 'sender',
        select: 'username avatar'
      })
      .populate({
        path: 'receiver',
        select: 'username avatar'
      })
      .sort({ createdAt: -1 });
    res.json({ messages });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
