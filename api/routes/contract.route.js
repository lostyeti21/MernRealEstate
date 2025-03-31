import express from 'express';
import multer from 'multer';
import { verifyToken } from '../utils/verifyUser.js';
import Contract from '../models/contract.model.js';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from the correct path
dotenv.config({ path: path.join(__dirname, '../.env') });

const router = express.Router();

// Initialize Supabase client with debug logging
console.log('Supabase Config:', {
  url: process.env.SUPABASE_URL ? 'Present' : 'Missing',
  key: process.env.SUPABASE_KEY ? 'Present' : 'Missing',
  bucket: process.env.SUPABASE_BUCKET
});

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials:', {
    url: !!supabaseUrl,
    key: !!supabaseKey
  });
}

const supabase = createClient(
  supabaseUrl || '', // Provide fallback empty string
  supabaseKey || ''  // Provide fallback empty string
);

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
});

// Create a new contract
router.post('/', verifyToken, async (req, res) => {
  try {
    console.log('User object:', req.user);
    const newContract = new Contract({
      ...req.body,
      senderName: req.user?.name || req.user?.username || 'Unknown Sender',
      userId: req.user.id
    });

    await newContract.save();

    res.status(201).json({
      success: true,
      contract: newContract
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Upload contract route
router.post('/upload', verifyToken, upload.single('contract'), async (req, res) => {
  try {
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration is missing');
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { property, landlordFirstname, landlordSurname, agentFirstname, agentSurname, tenantFirstname, tenantSurname } = req.body;

    if (!property) {
      return res.status(400).json({ message: 'Property is required' });
    }

    // Upload file to Supabase Storage
    const timestamp = Date.now();
    const fileName = `${timestamp}-${req.file.originalname}`;
    
    console.log('Starting Supabase upload:', {
      bucket: process.env.SUPABASE_BUCKET,
      fileName,
      fileSize: req.file.size,
      contentType: req.file.mimetype
    });

    // First, check if the bucket exists and create it if it doesn't
    const { data: buckets, error: bucketError } = await supabase
      .storage
      .listBuckets();

    if (bucketError) {
      console.error('Error listing buckets:', bucketError);
      throw new Error('Failed to access storage buckets');
    }

    console.log('Available buckets:', buckets.map(b => b.name));

    const bucketExists = buckets.some(b => b.name === process.env.SUPABASE_BUCKET);
    if (!bucketExists) {
      console.log('Bucket does not exist, creating it...');
      const { data: newBucket, error: createError } = await supabase
        .storage
        .createBucket(process.env.SUPABASE_BUCKET, {
          public: true,
          fileSizeLimit: 5242880, // 5MB in bytes
          allowedMimeTypes: ['application/pdf']
        });

      if (createError) {
        console.error('Error creating bucket:', createError);
        throw new Error('Failed to create storage bucket');
      }

      // Make sure the bucket is public
      const { error: updateError } = await supabase
        .storage
        .updateBucket(process.env.SUPABASE_BUCKET, {
          public: true
        });

      if (updateError) {
        console.error('Error making bucket public:', updateError);
        throw new Error('Failed to make bucket public');
      }

      console.log('Bucket created and made public successfully:', newBucket);
    } else {
      // If bucket exists, ensure it's public
      const { error: updateError } = await supabase
        .storage
        .updateBucket(process.env.SUPABASE_BUCKET, {
          public: true
        });

      if (updateError) {
        console.error('Error making bucket public:', updateError);
        throw new Error('Failed to make bucket public');
      }
    }

    const { data, error } = await supabase
      .storage
      .from(process.env.SUPABASE_BUCKET)
      .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false
      });

    if (error) {
      throw error;
    }

    const contractUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/${process.env.SUPABASE_BUCKET}/${data.path}`;

    console.log('User object:', req.user);
    const newContract = new Contract({
      ...req.body,
      senderName: req.user?.name || req.user?.username || 'Unknown Sender',
      contractUrl,
      userId: req.user.id
    });

    await newContract.save();

    res.status(201).json({
      success: true,
      contract: newContract,
      contractUrl
    });
  } catch (error) {
    console.error('Contract upload error:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({
      message: 'Error uploading contract',
      error: error.message,
    });
  }
});

// Get user's contracts
router.get('/user', verifyToken, async (req, res) => {
  try {
    const contracts = await Contract.find({ userId: req.user.id });
    res.status(200).json(contracts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all contracts
router.get('/', verifyToken, async (req, res) => {
  try {
    const contracts = await Contract.find({ userId: req.user.id });
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json(contracts);
  } catch (error) {
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ message: error.message });
  }
});

export default router;
