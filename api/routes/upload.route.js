import express from 'express';
import multer from 'multer';
import { uploadImage, uploadDocument } from '../controllers/upload.controller.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Configure multer for memory storage
const storage = multer.memoryStorage();

// Configure multer for images
const imageUpload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Not an image! Please upload an image file.'), false);
    }
  },
});

// Configure multer for documents
const documentUpload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and DOCX files are allowed'), false);
    }
  },
});

// Add logging middleware
const logRequest = (req, res, next) => {
  console.log('Upload request:', {
    user: req.user?._id,
    isAgent: req.user?.isAgent,
    hasFile: !!req.file
  });
  next();
};

router.post('/image', 
  verifyToken, 
  logRequest,
  imageUpload.single('image'), 
  uploadImage
);

router.post('/document',
  verifyToken,
  logRequest,
  documentUpload.single('document'),
  uploadDocument
);

// Add this route to test Cloudinary configuration
router.get('/test-config', (req, res) => {
  try {
    const config = {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      hasApiKey: !!process.env.CLOUDINARY_API_KEY,
      hasApiSecret: !!process.env.CLOUDINARY_API_SECRET
    };
    
    res.json({
      success: true,
      config
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
