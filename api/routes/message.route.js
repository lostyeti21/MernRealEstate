import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import Message from '../models/message.model.js';
import Conversation from '../models/conversation.model.js';
import mongoose from 'mongoose';

const router = express.Router();

// Get all conversations for a user
router.get('/conversations', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('Fetching conversations for user:', userId);
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Convert userId to ObjectId
    const userObjectId = new mongoose.Types.ObjectId(userId);
    
    // Find conversations where the user is a participant
    const conversations = await Conversation.find({
      'participants.userId': userObjectId
    })
    .sort({ updatedAt: -1 })
    .populate({
      path: 'participants.userId',
      select: 'username name email avatar',
      refPath: 'participants.userModel'
    })
    .populate({
      path: 'listingId',
      select: 'name title address regularPrice discountPrice type offer',
      model: 'Listing'
    })
    .lean();

    if (!conversations || conversations.length === 0) {
      return res.status(200).json({
        success: true,
        conversations: []
      });
    }

    // Get last message for each conversation
    const conversationsWithLastMessage = await Promise.all(
      conversations.map(async (conv) => {
        try {
          const lastMessage = await Message.findOne({ 
            conversationId: conv._id 
          })
          .sort({ createdAt: -1 })
          .select('content createdAt sender receiver read senderModel receiverModel')
          .populate({
            path: 'sender',
            select: 'username name avatar',
            refPath: 'senderModel'
          })
          .populate({
            path: 'receiver',
            select: 'username name avatar',
            refPath: 'receiverModel'
          })
          .lean();
          
          // Get unread count for this conversation
          const unreadCount = await Message.countDocuments({
            conversationId: conv._id,
            receiver: userObjectId,
            read: false
          });
          
          return {
            ...conv,
            lastMessage: lastMessage?.content || '',
            lastMessageTime: lastMessage?.createdAt || conv.createdAt || new Date(),
            lastMessageSender: lastMessage?.sender || null,
            lastMessageReceiver: lastMessage?.receiver || null,
            unreadCount
          };
        } catch (err) {
          console.error('Error processing conversation:', err);
          return {
            ...conv,
            lastMessage: '',
            lastMessageTime: conv.createdAt || new Date(),
            unreadCount: 0
          };
        }
      })
    );

    // Sort by last message time
    const sortedConversations = conversationsWithLastMessage.sort((a, b) => {
      const timeA = a.lastMessageTime ? new Date(a.lastMessageTime) : new Date(0);
      const timeB = b.lastMessageTime ? new Date(b.lastMessageTime) : new Date(0);
      return timeB - timeA;
    });

    console.log('Found conversations:', sortedConversations.length);
    
    res.status(200).json({
      success: true,
      conversations: sortedConversations
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching conversations',
      error: error.message
    });
  }
});

// Get unread message count
router.get('/unread-count', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('Fetching unread count for user:', userId);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Convert userId to ObjectId
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Get all unread messages for this user
    const unreadCount = await Message.countDocuments({
      receiver: userObjectId,
      read: false
    });

    console.log('Found unread messages:', unreadCount);
    
    res.status(200).json({
      success: true,
      count: unreadCount
    });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching unread count',
      error: error.message
    });
  }
});

// Get messages for a conversation
router.get('/:conversationId', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userObjectId = new mongoose.Types.ObjectId(userId);
    console.log('Fetching messages for conversation:', req.params.conversationId);
    console.log('Current user:', userId);
    
    const conversation = await Conversation.findOne({
      _id: req.params.conversationId,
      'participants.userId': userObjectId
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    const messages = await Message.find({
      conversationId: conversation._id
    })
    .sort({ createdAt: 1 })
    .populate('sender', 'username avatar')
    .populate('receiver', 'username avatar')
    .lean();

    // Transform messages to ensure sender is properly set
    const transformedMessages = messages.map(message => ({
      ...message,
      sender: message.sender._id || message.sender, // Ensure we have the ID
      receiver: message.receiver._id || message.receiver // Ensure we have the ID
    }));

    // Mark messages as read
    await Message.updateMany(
      {
        conversationId: conversation._id,
        receiver: userObjectId,
        read: false
      },
      { $set: { read: true } }
    );

    res.status(200).json({
      success: true,
      messages: transformedMessages
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching messages',
      error: error.message
    });
  }
});

// Mark messages as read
router.post('/mark-read', verifyToken, async (req, res) => {
  try {
    const { conversationId } = req.body;
    const userId = req.user.id;

    if (!conversationId) {
      return res.status(400).json({
        success: false,
        message: 'Conversation ID is required'
      });
    }

    // Convert IDs to ObjectId
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const conversationObjectId = new mongoose.Types.ObjectId(conversationId);

    // Update all unread messages in this conversation where the current user is the receiver
    const result = await Message.updateMany(
      {
        conversationId: conversationObjectId,
        receiver: userObjectId,
        read: false
      },
      {
        $set: { read: true }
      }
    );

    // Get the updated unread count for this conversation
    const unreadCount = await Message.countDocuments({
      conversationId: conversationObjectId,
      receiver: userObjectId,
      read: false
    });

    // Update the conversation's unread count using dot notation
    await Conversation.findByIdAndUpdate(
      conversationObjectId,
      { 
        $set: { [`unreadCount.${userId}`]: unreadCount }
      }
    );

    res.status(200).json({
      success: true,
      message: 'Messages marked as read',
      modifiedCount: result.modifiedCount,
      unreadCount
    });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking messages as read',
      error: error.message
    });
  }
});

// Create or get conversation
router.post('/conversation', verifyToken, async (req, res) => {
  try {
    const { receiverId, receiverModel, listingId, initialMessage } = req.body;

    if (!receiverId || !receiverModel || !listingId || !initialMessage) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Find or create conversation
    let conversation = await Conversation.findOne({
      'participants.userId': { $all: [req.user.id, receiverId] },
      listingId
    });

    if (!conversation) {
      conversation = new Conversation({
        participants: [
          { userId: req.user.id, userModel: 'User' },
          { userId: receiverId, userModel: receiverModel }
        ],
        listingId,
        lastMessage: initialMessage,
        lastMessageTime: new Date(),
        unreadCount: { [receiverId]: 1 } // Initialize unread count for receiver
      });
      await conversation.save();
    }

    // Create initial message
    const message = new Message({
      conversationId: conversation._id,
      sender: req.user.id,
      senderModel: 'User',
      receiver: receiverId,
      receiverModel: receiverModel,
      content: initialMessage,
      read: false,
      createdAt: new Date()
    });
    await message.save();

    // Update conversation's last message
    if (conversation.lastMessage !== initialMessage) {
      conversation.lastMessage = initialMessage;
      conversation.lastMessageTime = new Date();
      
      // Increment unread count for receiver if this is a new message
      const currentUnreadCount = conversation.unreadCount?.[receiverId] || 0;
      conversation.unreadCount = {
        ...conversation.unreadCount,
        [receiverId]: currentUnreadCount + 1
      };
      
      await conversation.save();
    }

    // Populate the conversation before sending response
    await conversation.populate([
      {
        path: 'participants.userId',
        select: 'username name email avatar',
        refPath: 'participants.userModel'
      },
      {
        path: 'listingId',
        select: 'name title address regularPrice discountPrice type offer',
        model: 'Listing'
      }
    ]);

    res.status(200).json({
      success: true,
      conversation
    });
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating conversation',
      error: error.message
    });
  }
});

// Delete conversation
router.delete('/conversation/:id', verifyToken, async (req, res) => {
  try {
    const conversationId = req.params.id;
    const userId = req.user.id;

    // Check if conversation exists and user is a participant
    const conversation = await Conversation.findOne({
      _id: conversationId,
      'participants.userId': userId
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found or you are not a participant'
      });
    }

    // Delete all messages in the conversation
    await Message.deleteMany({ conversationId });

    // Delete the conversation
    await Conversation.findByIdAndDelete(conversationId);

    res.status(200).json({
      success: true,
      message: 'Conversation deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting conversation',
      error: error.message
    });
  }
});

// Clear all conversations and messages (development only)
router.delete('/clear-all', verifyToken, async (req, res) => {
  try {
    await Conversation.deleteMany({});
    await Message.deleteMany({});
    
    res.status(200).json({
      success: true,
      message: 'All conversations and messages cleared'
    });
  } catch (error) {
    console.error('Error clearing conversations:', error);
    res.status(500).json({
      success: false,
      message: 'Error clearing conversations and messages'
    });
  }
});

// Send a message
router.post('/', verifyToken, async (req, res) => {
  try {
    const { conversationId, content } = req.body;
    const userId = req.user.id;

    if (!conversationId || !content) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Convert IDs to ObjectId
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const conversationObjectId = new mongoose.Types.ObjectId(conversationId);

    // Get the conversation to find the receiver
    const conversation = await Conversation.findById(conversationObjectId);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    // Find the receiver (the other participant)
    const receiver = conversation.participants.find(
      p => p.userId.toString() !== userId
    );

    if (!receiver) {
      return res.status(400).json({
        success: false,
        message: 'Receiver not found in conversation'
      });
    }

    // Create the message
    const message = new Message({
      conversationId: conversationObjectId,
      sender: userObjectId,
      senderModel: 'User',
      receiver: receiver.userId,
      receiverModel: receiver.userModel,
      content,
      read: false
    });
    await message.save();

    // Update conversation's last message and time
    conversation.lastMessage = content;
    conversation.lastMessageTime = new Date();

    // Increment unread count for the receiver
    const receiverId = receiver.userId.toString();
    const currentUnreadCount = conversation.unreadCount?.[receiverId] || 0;
    conversation.unreadCount = {
      ...conversation.unreadCount,
      [receiverId]: currentUnreadCount + 1
    };

    await conversation.save();

    // Populate sender and receiver info
    await message.populate('sender', 'username avatar');
    await message.populate('receiver', 'username avatar');

    res.status(201).json({
      success: true,
      message: message
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending message',
      error: error.message
    });
  }
});

export default router;
