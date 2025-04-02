import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import userRouter from './routes/user.route.js';
import authRouter from './routes/auth.route.js';
import listingRouter from './routes/listing.route.js';
import messageRouter from './routes/message.route.js';
import tenantRatingRouter from './routes/tenantRating.route.js';
import landlordRatingRouter from './routes/landlordRating.route.js';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { initializeSocket } from './socket/socket.js';
import cors from 'cors';
import uploadRouter from './routes/upload.route.js';
import agentRouter from './routes/agent.route.js';
import agentProfileRouter from './routes/agentProfile.route.js';
import companyRouter from './routes/real-estate.route.js';
import codeRouter from './routes/code.route.js';
import analyticsRouter from './routes/analytics.route.js';
import timeAnalyticsRouter from './routes/timeAnalytics.route.js';
import searchAnalyticsRouter from './routes/searchAnalytics.route.js';
import priceAnalyticsRouter from './routes/priceAnalytics.route.js';
import ctrAnalyticsRouter from './routes/ctrAnalytics.route.js';
import agentRatingRouter from './routes/agent-rating.route.js';
import sessionAnalyticsRouter from './routes/sessionAnalytics.route.js';
import notificationRouter from './routes/notification.route.js';
import disputeRouter from './routes/dispute.route.js';
import reservationRouter from './routes/reservation.route.js';
import ratingNotificationRouter from './routes/ratingNotification.route.js';
import contractRouter from './routes/contract.route.js';
import emailRouter from './routes/email.js';

// Load environment variables at the very start
dotenv.config();

// Verify environment variables are loaded
console.log('Environment Check:', {
  hasCloudinaryConfig: !!process.env.CLOUDINARY_CLOUD_NAME,
  nodeEnv: process.env.NODE_ENV
});

mongoose
  .connect(process.env.MONGO)
  .then(() => {
    console.log('Connected to MongoDB!');
  })
  .catch((err) => {
    console.log(err);
  });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = initializeSocket(httpServer);

app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Super-User-Auth']
}));

// Add CORS logging middleware
app.use((req, res, next) => {
  console.log('CORS Check:', {
    origin: req.headers.origin,
    method: req.method,
    path: req.path,
    allowedOrigin: res.getHeader('Access-Control-Allow-Origin')
  });
  next();
});

app.use(express.json());
app.use(cookieParser());

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`🔍 [API] ${req.method} ${req.path}`, {
    query: req.query,
    body: req.body,
    headers: {
      authorization: req.headers.authorization ? 'present' : 'missing',
      contentType: req.headers['content-type']
    }
  });
  next();
});

console.log('📝 [API] Starting route registration...');

// Debug: Print all registered routes
const listEndpoints = (app) => {
  const endpoints = [];
  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      endpoints.push({
        path: middleware.route.path,
        methods: Object.keys(middleware.route.methods)
      });
    } else if (middleware.name === 'router') {
      middleware.handle.stack.forEach((handler) => {
        if (handler.route) {
          endpoints.push({
            path: handler.route.path,
            methods: Object.keys(handler.route.methods)
          });
        }
      });
    }
  });
  return endpoints;
};

app.use('/api/user', userRouter);
app.use('/api/auth', authRouter);
app.use('/api/listing', listingRouter);
app.use('/api/messages', messageRouter);
app.use('/api/tenant-rating', tenantRatingRouter);
app.use('/api/landlord-rating', landlordRatingRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/agent', agentRouter);
app.use('/api/agent-profile', agentProfileRouter);
app.use('/api/real-estate', companyRouter);
app.use('/api/code', codeRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/analytics/time', timeAnalyticsRouter);
app.use('/api/analytics/search', searchAnalyticsRouter);
app.use('/api/analytics/price', priceAnalyticsRouter);
app.use('/api/analytics/ctr', ctrAnalyticsRouter);
app.use('/api/agent-rating', agentRatingRouter);
app.use('/api/session-analytics', sessionAnalyticsRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api/dispute', disputeRouter);
app.use('/api/reservation', reservationRouter);
app.use('/api/rating-notifications', ratingNotificationRouter);
app.use('/api/contracts', contractRouter);
app.use('/api/email', emailRouter);

console.log('📝 [API] Routes registered. Available endpoints:', listEndpoints(app));

// Serve static files from uploads directory
app.use('/uploads', express.static('uploads'));

// Error handling middleware
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'An unexpected error occurred';
  res.status(statusCode).json({
    success: false,
    message,
  });
});

// Add global error handler middleware
app.use((err, req, res, next) => {
  console.error('Global Error Handler:', {
    path: req.path,
    method: req.method,
    error: err
  });
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  return res.status(statusCode).json({
    success: false,
    statusCode,
    message,
  });
});

// Only serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
} else {
  // In development, handle API routes only
  app.get('/', (req, res) => {
    res.json({ message: 'API is running' });
  });
}

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
