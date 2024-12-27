import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import userRouter from './routes/user.route.js';
import authRouter from './routes/auth.route.js';
import listingRouter from './routes/listing.route.js';
import agentRouter from './routes/agent.route.js';
import companyRouter from './routes/real-estate.route.js';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import uploadRouter from './routes/upload.route.js';

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

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());

// API routes
app.use('/api/user', userRouter);
app.use('/api/auth', authRouter);
app.use('/api/listing', listingRouter);
app.use('/api/agent', agentRouter);
app.use('/api/company', companyRouter);
app.use('/api/upload', uploadRouter);

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

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  return res.status(statusCode).json({
    success: false,
    statusCode,
    message,
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}!`);
});
