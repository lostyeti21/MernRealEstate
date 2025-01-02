import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import Message from '../models/message.model.js';
import Conversation from '../models/conversation.model.js';
import cookie from 'cookie';

const connectedUsers = new Map();

export const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "http://localhost:5173",
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  // Middleware for authentication
  io.use(async (socket, next) => {
    try {
      const cookies = socket.handshake.headers.cookie 
        ? cookie.parse(socket.handshake.headers.cookie)
        : {};
      
      const token = cookies.access_token;
      
      if (!token) {
        return next(new Error('Authentication required'));
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.id;
        socket.userModel = decoded.isRealEstateCompany ? 'Company' : 'User';
        next();
      } catch (jwtError) {
        return next(new Error('Invalid token'));
      }
    } catch (error) {
      return next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    console.log('User connected:', {
      userId: socket.userId,
      userModel: socket.userModel,
      socketId: socket.id
    });
    
    connectedUsers.set(socket.userId, socket.id);

    // Handle typing events
    socket.on('typing', (data) => {
      console.log('Typing event:', {
        userId: socket.userId,
        conversationId: data.conversationId
      });
      
      socket.to(data.conversationId).emit('user_typing', {
        conversationId: data.conversationId,
        userId: socket.userId
      });
    });

    socket.on('stop_typing', (data) => {
      console.log('Stop typing event:', {
        userId: socket.userId,
        conversationId: data.conversationId
      });
      
      socket.to(data.conversationId).emit('user_stop_typing', {
        conversationId: data.conversationId,
        userId: socket.userId
      });
    });

    // Send a message
    socket.on('send_message', async (data) => {
      try {
        console.log('Received send_message event from user:', socket.userId, 'data:', data);

        const { conversationId, content, receiver, receiverModel, attachment } = data;

        // Validate required fields
        if (!conversationId || !content || !receiver) {
          throw new Error('Missing required message fields');
        }

        // Create message
        const message = new Message({
          conversationId,
          sender: socket.userId,
          senderModel: socket.userModel,
          receiver,
          receiverModel: receiverModel || 'User',
          content,
          attachment,
          read: false,
          createdAt: new Date()
        });

        // Save message
        const savedMessage = await message.save();
        console.log('Message saved with ID:', savedMessage._id);

        // Populate sender details
        const populatedMessage = await Message.findById(savedMessage._id)
          .populate('sender', 'username name avatar')
          .populate('receiver', 'username name avatar');

        // Update conversation's last message
        await Conversation.findByIdAndUpdate(conversationId, {
          lastMessage: content,
          lastMessageTime: new Date()
        });

        // Get receiver's socket ID
        const receiverSocketId = connectedUsers.get(receiver);
        console.log('Receiver socket ID for user', receiver, ':', receiverSocketId);

        // Send to receiver
        if (receiverSocketId) {
          console.log('Emitting new_message to receiver:', receiverSocketId);
          io.to(receiverSocketId).emit('new_message', {
            conversationId,
            message: populatedMessage.toObject()
          });
        } else {
          console.log('Receiver not connected:', receiver);
        }

        // Send acknowledgment to sender
        console.log('Sending message_sent acknowledgment to sender');
        socket.emit('message_sent', {
          success: true,
          message: populatedMessage.toObject()
        });

      } catch (error) {
        console.error('Error in send_message handler:', error);
        socket.emit('message_error', {
          error: error.message || 'Failed to send message'
        });
      }
    });

    // Handle socket connection
    socket.on('join_conversation', (conversationId) => {
      console.log('User', socket.userId, 'joining conversation:', conversationId);
      socket.join(conversationId);
    });

    // Handle socket disconnection
    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.userId);
      // Remove user from connected users map
      for (const [key, value] of connectedUsers.entries()) {
        if (value === socket.id) {
          connectedUsers.delete(key);
          break;
        }
      }
    });
  });

  return io;
};
