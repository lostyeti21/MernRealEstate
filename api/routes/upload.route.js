import express from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import path from 'path';

// Configure dotenv with explicit path
dotenv.config({ path: path.resolve(process.cwd(), 'api/.env') });

const router = express.Router();

// Log environment variables to debug
console.log('Cloudinary Config:', {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  has_secret: !!process.env.CLOUDINARY_API_SECRET
});

// Configure Cloudinary with environment variables
cloudinary.config({
  cloud_name: 'dz2xooaha',
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
}).single('image');

router.post('/image', (req, res) => {
  upload(req, res, async function(err) {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
      // Convert buffer to base64 string
      const b64 = Buffer.from(req.file.buffer).toString('base64');
      const dataURI = `data:${req.file.mimetype};base64,${b64}`;

      // Upload to Cloudinary
      const result = await cloudinary.uploader.upload(dataURI, {
        resource_type: 'auto',
        folder: 'mern_estate'
      });

      res.json({ imageUrl: result.secure_url });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ error: 'Failed to upload image' });
    }
  });
});

export default router;
