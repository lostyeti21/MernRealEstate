import { v2 as cloudinary } from 'cloudinary';
import { errorHandler } from '../utils/error.js';
import dotenv from 'dotenv';

// Ensure environment variables are loaded
dotenv.config();

// Configure Cloudinary with explicit values
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

export const uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) {
      return next(errorHandler(400, 'No file uploaded'));
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return next(errorHandler(400, 'Only PDF and DOCX files are allowed'));
    }

    // Validate file size (2MB limit)
    const maxSize = 2 * 1024 * 1024; // 2MB in bytes
    if (req.file.size > maxSize) {
      return next(errorHandler(400, 'File size must be less than 2MB'));
    }

    console.log('Processing document upload:', {
      fileSize: req.file.size,
      mimeType: req.file.mimetype
    });

    // Convert buffer to base64
    const b64 = Buffer.from(req.file.buffer).toString('base64');
    const dataURI = `data:${req.file.mimetype};base64,${b64}`;

    try {
      // Upload to Cloudinary
      const result = await cloudinary.uploader.upload(dataURI, {
        resource_type: 'raw',
        folder: 'lease-agreements',
        format: req.file.mimetype.includes('pdf') ? 'pdf' : 'docx',
        public_id: `lease-${Date.now()}`,
        tags: ['lease-agreement'],
        access_mode: 'public',
        type: 'upload'
      });

      console.log('Document upload successful:', {
        publicId: result.public_id,
        url: result.secure_url
      });

      res.status(200).json({
        success: true,
        url: result.secure_url,
        public_id: result.public_id
      });
    } catch (cloudinaryError) {
      console.error('Cloudinary upload error:', cloudinaryError);
      return next(errorHandler(500, 'Error uploading to Cloudinary: ' + cloudinaryError.message));
    }
  } catch (error) {
    console.error('Document upload error:', error);
    next(errorHandler(500, error.message));
  }
};

export const uploadImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return next(errorHandler(400, 'No file uploaded'));
    }

    // Verify Cloudinary configuration
    console.log('Cloudinary Config:', {
      hasCloudName: !!process.env.CLOUDINARY_CLOUD_NAME,
      hasApiKey: !!process.env.CLOUDINARY_API_KEY,
      hasApiSecret: !!process.env.CLOUDINARY_API_SECRET
    });

    console.log('Processing upload:', {
      fileSize: req.file.size,
      mimeType: req.file.mimetype
    });

    // Convert buffer to base64
    const b64 = Buffer.from(req.file.buffer).toString('base64');
    const dataURI = `data:${req.file.mimetype};base64,${b64}`;

    try {
      // Upload to Cloudinary
      const result = await cloudinary.uploader.upload(dataURI, {
        resource_type: 'auto',
        folder: 'real-estate',
      });

      console.log('Upload successful:', {
        publicId: result.public_id,
        url: result.secure_url
      });

      res.status(200).json({
        success: true,
        url: result.secure_url,
        public_id: result.public_id
      });
    } catch (cloudinaryError) {
      console.error('Cloudinary upload error:', cloudinaryError);
      return next(errorHandler(500, 'Error uploading to Cloudinary: ' + cloudinaryError.message));
    }
  } catch (error) {
    console.error('Upload error:', error);
    next(errorHandler(500, error.message));
  }
};