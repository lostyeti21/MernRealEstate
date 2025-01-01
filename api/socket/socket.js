import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import Message from '../models/message.model.js';
import Conversation from '../models/conversation.model.js';

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
      const token = socket.handshake.auth.token;
      
      if (!token) {
        console.error('No token provided in socket handshake');
        return next(new Error('No token provided'));
      }

      console.log('Socket authentication - token received');

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('Socket authentication - token verified for user:', decoded.id);
        
        socket.userId = decoded.id;
        socket.userModel = decoded.isAgent ? 'Agent' : 'User';
        next();
      } catch (jwtError) {
        console.error('JWT verification failed:', jwtError);
        return next(new Error('Invalid token'));
      }
    } catch (error) {
      console.error('Socket authentication error:', error);
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

    // Join a conversation room
    socket.on('join_conversation', (conversationId) => {
      socket.join(conversationId);
      console.log('User joined conversation:', {
        userId: socket.userId,
        conversationId
      });
    });

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
        console.log('Received send_message event:', {
          userId: socket.userId,
          ...data
        });

        const { conversationId, receiverId, receiverModel, content, attachment } = data;

        // Create message
        const message = new Message({
          conversationId,
          sender: socket.userId,
          senderModel: socket.userModel,
          receiver: receiverId,
          receiverModel,
          content,
          attachment,
          read: false
        });

        console.log('Created message object:', message);

        // Save message
        await message.save();
        console.log('Message saved successfully');

        // Update conversation's last message
        await Conversation.findByIdAndUpdate(conversationId, {
          lastMessage: content,
          lastMessageTime: new Date()
        });

        // Get receiver's socket ID
        const receiverSocketId = connectedUsers.get(receiverId);
        console.log('Receiver socket ID:', receiverSocketId);

        // Emit to conversation room
        io.to(conversationId).emit('receive_message', {
          conversationId,
          message: {
            ...message.toObject(),
            createdAt: new Date()
          }
        });

        // Also emit directly to receiver if online
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('new_message', {
            conversationId,
            message: {
              ...message.toObject(),
              createdAt: new Date()
            }
          });
        }

        // Send acknowledgment
        socket.emit('message_sent', {
          success: true,
          message: message
        });

      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('message_error', {
          error: error.message
        });
      }
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.userId);
      connectedUsers.delete(socket.userId);
    });
  });

  return io;
};
