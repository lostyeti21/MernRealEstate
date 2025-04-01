import express from 'express';
import multer from 'multer';
import { verifyToken } from '../utils/verifyUser.js';
import Contract from '../models/contract.model.js';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../models/user.model.js';
import Notification from '../models/notification.model.js';

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

// Get all contracts for the current user
router.get('/', verifyToken, async (req, res) => {
  try {
    // Find contracts where the user is the creator
    const contracts = await Contract.find({ userId: req.user.id });
    
    // Get signature information for each contract
    const contractsWithSignatures = await Promise.all(
      contracts.map(async (contract) => {
        const contractObj = contract.toObject();
        
        // Get information about all users who have signed
        if (contractObj.signatures && contractObj.signatures.length > 0) {
          const signatureDetails = await Promise.all(
            contractObj.signatures.map(async (userId) => {
              const user = await User.findById(userId);
              return {
                userId: userId.toString(),
                username: user?.username || 'Unknown User',
                name: user?.name || user?.username || 'Unknown User',
                avatar: user?.avatar || '',
                signedAt: new Date() // In a real app, you'd store the sign date for each signature
              };
            })
          );
          contractObj.signatures = signatureDetails;
        } else {
          contractObj.signatures = [];
        }
        
        // Get information about all users who still need to sign
        if (contractObj.pendingSignatures && contractObj.pendingSignatures.length > 0) {
          const pendingSignatureDetails = await Promise.all(
            contractObj.pendingSignatures.map(async (userId) => {
              const user = await User.findById(userId);
              return {
                userId: userId.toString(),
                username: user?.username || 'Pending User',
                name: user?.name || user?.username || 'Pending User',
                avatar: user?.avatar || '',
              };
            })
          );
          contractObj.pendingSignatures = pendingSignatureDetails;
        } else {
          contractObj.pendingSignatures = [];
        }
        
        return contractObj;
      })
    );
    
    res.status(200).json(contractsWithSignatures);
  } catch (error) {
    console.error('Error fetching contracts:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get contracts that need the user's signature
router.get('/pending-signature', verifyToken, async (req, res) => {
  try {
    console.log('Fetching contracts needing signature for user:', req.user.id);
    
    // Find contracts where the user's ID is in the pendingSignatures array
    // Using $in operator to handle potential format differences
    const contracts = await Contract.find({
      pendingSignatures: { $in: [req.user.id, req.user._id?.toString()] },
      fullySignedAt: null // Only include contracts that aren't fully signed
    });
    
    console.log(`Found ${contracts.length} contracts needing signature`);
    
    // Ensure all contracts have sender information
    const contractsWithSenderInfo = await Promise.all(
      contracts.map(async (contract) => {
        const contractObj = contract.toObject();
        
        // Always try to get the sender information, even if senderName exists
        // This ensures consistent sender information for all contracts
        if (contractObj.userId) {
          try {
            const sender = await User.findById(contractObj.userId);
            if (sender) {
              // Update the contract in the database with the correct sender name
              // This ensures future requests will have the correct information
              contractObj.senderName = sender.name || sender.username || 'Unknown Sender';
              
              // Also update the contract in the database to fix it permanently
              await Contract.findByIdAndUpdate(contract._id, {
                senderName: contractObj.senderName
              });
              
              console.log(`Updated sender name for contract ${contract._id} to ${contractObj.senderName}`);
            }
          } catch (err) {
            console.error('Error finding sender for contract', contract._id, ':', err);
          }
        }
        
        return contractObj;
      })
    );
    
    res.status(200).json(contractsWithSenderInfo);
  } catch (error) {
    console.error('Error fetching contracts needing signature:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get count of contracts that need the user's signature
router.get('/pending-signature-count', verifyToken, async (req, res) => {
  try {
    console.log('Fetching count of contracts needing signature for user:', req.user.id);
    
    // Find contracts where the user's ID is in the pendingSignatures array
    // Using $in operator to handle potential format differences
    const count = await Contract.countDocuments({
      pendingSignatures: { $in: [req.user.id, req.user._id?.toString()] },
      fullySignedAt: null // Only include contracts that aren't fully signed
    });
    
    console.log(`Found ${count} contracts needing signature`);
    
    res.status(200).json({ count });
  } catch (error) {
    console.error('Error fetching contracts count needing signature:', error);
    res.status(500).json({ message: error.message });
  }
});

// Send contract notifications to relevant users
router.post('/send-notifications', verifyToken, async (req, res) => {
  try {
    const { contractId } = req.body;
    
    if (!contractId) {
      return res.status(400).json({ message: 'Contract ID is required' });
    }
    
    // Find the contract
    const contract = await Contract.findById(contractId);
    
    if (!contract) {
      return res.status(404).json({ message: 'Contract not found' });
    }
    
    // Verify the user is the sender of the contract
    if (contract.userId !== req.user.id) {
      return res.status(403).json({ message: 'You are not authorized to send notifications for this contract' });
    }
    
    // Get sender information
    const sender = await User.findById(req.user.id);
    const senderName = sender?.name || sender?.username || req.user.username || 'Unknown Sender';
    
    // Ensure the contract has the correct senderName
    if (!contract.senderName || contract.senderName === 'Unknown Sender') {
      contract.senderName = senderName;
      // Save the updated senderName
      await contract.save();
      console.log(`Updated senderName for contract ${contractId} to ${senderName}`);
    }
    
    // Find users who need to sign (landlord, agent, tenant)
    const usersToNotify = [];
    const pendingSignatures = [];
    
    // Find landlord if exists
    if (contract.landlordId) {
      const landlord = await User.findById(contract.landlordId);
      if (landlord) {
        usersToNotify.push({
          userId: landlord._id.toString(),
          role: 'landlord',
          name: `${contract.landlordFirstname} ${contract.landlordSurname}`
        });
        pendingSignatures.push(landlord._id.toString());
      }
    } else if (contract.landlordFirstname && contract.landlordSurname) {
      // Try to find landlord by name
      const landlord = await User.findOne({
        $or: [
          { username: `${contract.landlordFirstname} ${contract.landlordSurname}` },
          { name: `${contract.landlordFirstname} ${contract.landlordSurname}` }
        ]
      });
      
      if (landlord) {
        usersToNotify.push({
          userId: landlord._id.toString(),
          role: 'landlord',
          name: `${contract.landlordFirstname} ${contract.landlordSurname}`
        });
        pendingSignatures.push(landlord._id.toString());
        
        // Update contract with landlord ID
        contract.landlordId = landlord._id.toString();
      }
    }
    
    // Find agent if exists
    if (contract.agentId) {
      const agent = await User.findById(contract.agentId);
      if (agent) {
        usersToNotify.push({
          userId: agent._id.toString(),
          role: 'agent',
          name: `${contract.agentFirstname} ${contract.agentSurname}`
        });
        pendingSignatures.push(agent._id.toString());
      }
    } else if (contract.agentFirstname && contract.agentSurname) {
      // Try to find agent by name
      const agent = await User.findOne({
        $or: [
          { username: `${contract.agentFirstname} ${contract.agentSurname}` },
          { name: `${contract.agentFirstname} ${contract.agentSurname}` }
        ]
      });
      
      if (agent) {
        usersToNotify.push({
          userId: agent._id.toString(),
          role: 'agent',
          name: `${contract.agentFirstname} ${contract.agentSurname}`
        });
        pendingSignatures.push(agent._id.toString());
        
        // Update contract with agent ID
        contract.agentId = agent._id.toString();
      }
    }
    
    // Find tenant if exists
    if (contract.tenantId) {
      const tenant = await User.findById(contract.tenantId);
      if (tenant) {
        usersToNotify.push({
          userId: tenant._id.toString(),
          role: 'tenant',
          name: `${contract.tenantFirstname} ${contract.tenantSurname}`
        });
        pendingSignatures.push(tenant._id.toString());
      }
    } else if (contract.tenantFirstname && contract.tenantSurname) {
      // Try to find tenant by name
      const tenant = await User.findOne({
        $or: [
          { username: `${contract.tenantFirstname} ${contract.tenantSurname}` },
          { name: `${contract.tenantFirstname} ${contract.tenantSurname}` }
        ]
      });
      
      if (tenant) {
        usersToNotify.push({
          userId: tenant._id.toString(),
          role: 'tenant',
          name: `${contract.tenantFirstname} ${contract.tenantSurname}`
        });
        pendingSignatures.push(tenant._id.toString());
        
        // Update contract with tenant ID
        contract.tenantId = tenant._id.toString();
      }
    }
    
    if (usersToNotify.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No users to notify'
      });
    }
    
    // Update contract with pending signatures
    // Use findByIdAndUpdate to avoid validation issues
    await Contract.findByIdAndUpdate(
      contractId,
      { 
        pendingSignatures,
        landlordId: contract.landlordId,
        agentId: contract.agentId,
        tenantId: contract.tenantId,
        senderName: senderName // Always use the most up-to-date sender name
      },
      { new: true }
    );
    
    // Create notifications for each user
    const notifications = [];
    for (const user of usersToNotify) {
      // Ensure userId is a string
      const userId = user.userId.toString();
      
      const notification = new Notification({
        type: 'contract_signature_required',
        to: userId,
        from: req.user.id,
        title: 'Contract Signature Required',
        content: `A new contract for property "${contract.property}" requires your signature.`,
        data: {
          contractId: contract._id.toString(),
          property: contract.property,
          role: user.role,
          senderName: senderName // Include sender name in notification data
        },
        read: false,
        category: 'contract' // Set category to 'contract' to separate from regular notifications
      });
      
      await notification.save();
      notifications.push(notification);
    }
    
    res.status(200).json({
      success: true,
      message: `Notifications sent to ${notifications.length} users`,
      notifiedUsers: usersToNotify.map(user => user.name),
      notifications
    });
  } catch (error) {
    console.error('Error sending contract notifications:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get contracts signed by the current user
router.get('/signed-by-me', verifyToken, async (req, res) => {
  try {
    console.log('Fetching contracts signed by user:', req.user.id);
    
    // Find contracts where the current user's ID is in the signatures array
    const contracts = await Contract.find({
      signatures: { $in: [req.user.id] }
    });
    
    console.log(`Found ${contracts.length} contracts signed by user ${req.user.id}`);
    
    // Get sender information for each contract
    const contractsWithSenderInfo = await Promise.all(
      contracts.map(async (contract) => {
        let senderInfo = {};
        if (contract.userId) {
          const sender = await User.findById(contract.userId);
          if (sender) {
            senderInfo = {
              senderName: sender.username || 'Unknown User',
              senderAvatar: sender.avatar || ''
            };
          }
        }
        
        return {
          ...contract.toObject(),
          ...senderInfo
        };
      })
    );
    
    res.status(200).json(contractsWithSenderInfo);
  } catch (error) {
    console.error('Error fetching signed contracts:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get a single contract by ID
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const contractId = req.params.id;
    
    if (!contractId) {
      return res.status(400).json({ message: 'Contract ID is required' });
    }
    
    console.log('Fetching contract by ID:', contractId);
    
    // Find the contract
    const contract = await Contract.findById(contractId);
    
    if (!contract) {
      return res.status(404).json({ message: 'Contract not found' });
    }
    
    // Get sender information
    let senderInfo = {};
    if (contract.userId) {
      const sender = await User.findById(contract.userId);
      if (sender) {
        senderInfo = {
          senderName: sender.username || 'Unknown User',
          senderAvatar: sender.avatar || ''
        };
      }
    }
    
    // Get information about all users who have signed
    const signatureDetails = await Promise.all(
      (contract.signatures || []).map(async (userId) => {
        const user = await User.findById(userId);
        return {
          userId: userId.toString(),
          username: user?.username || 'Unknown User',
          name: user?.name || user?.username || 'Unknown User',
          avatar: user?.avatar || '',
          signedAt: new Date() // In a real app, you'd store the sign date for each signature
        };
      })
    );
    
    // Check if the current user has signed
    const userHasSigned = contract.signatures && contract.signatures.some(id => 
      id.toString() === req.user.id.toString()
    );
    
    // Check if the current user needs to sign
    const userNeedsToSign = contract.pendingSignatures && contract.pendingSignatures.some(id => 
      id.toString() === req.user.id.toString()
    );
    
    // Return the contract with additional information
    res.status(200).json({
      ...contract.toObject(),
      ...senderInfo,
      signatures: signatureDetails,
      userHasSigned,
      userNeedsToSign,
      pendingSignaturesArray: contract.pendingSignatures.map(id => id.toString())
    });
  } catch (error) {
    console.error('Error fetching contract:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Sign a contract
router.post('/sign', verifyToken, async (req, res) => {
  try {
    const { contractId, agreed } = req.body;
    
    console.log('Sign contract request received:', {
      contractId,
      agreed,
      userId: req.user.id,
      userIdType: typeof req.user.id,
      userObjectId: req.user._id?.toString()
    });
    
    if (!contractId) {
      return res.status(400).json({ message: 'Contract ID is required' });
    }
    
    if (!agreed) {
      return res.status(400).json({ message: 'You must agree to the contract terms' });
    }
    
    // Find the contract
    const contract = await Contract.findById(contractId);
    
    if (!contract) {
      console.log('Contract not found:', contractId);
      return res.status(404).json({ message: 'Contract not found' });
    }
    
    console.log('Contract found:', {
      id: contract._id,
      property: contract.property,
      pendingSignatures: contract.pendingSignatures,
      pendingSignaturesTypes: contract.pendingSignatures.map(id => typeof id),
      signatures: contract.signatures
    });
    
    // Check if user is in pendingSignatures - handle different ID formats
    const userIdString = req.user.id.toString();
    const userIdObjectString = req.user._id?.toString();
    
    console.log('Comparing user IDs:', {
      userIdString,
      userIdObjectString,
      pendingSignatures: contract.pendingSignatures.map(id => id.toString())
    });
    
    const userIdInPendingSignatures = contract.pendingSignatures.some(id => {
      const pendingIdString = id.toString();
      const match = pendingIdString === userIdString || pendingIdString === userIdObjectString;
      console.log(`Comparing ${pendingIdString} with ${userIdString}/${userIdObjectString}: ${match}`);
      return match;
    });
    
    if (!userIdInPendingSignatures) {
      console.log('Authorization failed. User not in pendingSignatures');
      return res.status(403).json({ message: 'You are not authorized to sign this contract' });
    }
    
    console.log('User authorized to sign contract');
    
    // Remove user from pendingSignatures and add to signatures
    const updatedPendingSignatures = contract.pendingSignatures.filter(id => {
      const pendingIdString = id.toString();
      return pendingIdString !== userIdString && pendingIdString !== userIdObjectString;
    });
    
    const updatedSignatures = [...(contract.signatures || []), req.user.id];
    
    // Check if all required signatures are collected
    let fullySignedAt = contract.fullySignedAt;
    if (updatedPendingSignatures.length === 0) {
      fullySignedAt = new Date();
    }
    
    console.log('Updating contract with:', {
      updatedPendingSignatures,
      updatedSignatures,
      fullySignedAt
    });
    
    // Update the contract
    const updatedContract = await Contract.findByIdAndUpdate(
      contractId,
      {
        pendingSignatures: updatedPendingSignatures,
        signatures: updatedSignatures,
        fullySignedAt
      },
      { new: true }
    );
    
    // Create notification for the contract sender
    if (contract.userId) {
      const notification = new Notification({
        type: 'contract_signed',
        to: contract.userId,
        from: req.user.id,
        title: 'Contract Signed',
        content: `${req.user.username || 'A user'} has signed the contract for property "${contract.property}".`,
        data: {
          contractId: contract._id.toString(),
          property: contract.property,
          signedBy: req.user.id
        },
        read: false,
        category: 'contract'
      });
      
      await notification.save();
      console.log('Notification created for contract sender');
    }
    
    // Get information about all users who have signed
    const signatureDetails = await Promise.all(
      updatedSignatures.map(async (userId) => {
        const user = await User.findById(userId);
        return {
          userId,
          username: user?.username || 'Unknown User',
          name: user?.name || user?.username || 'Unknown User',
          avatar: user?.avatar || '',
          signedAt: new Date() // In a real app, you'd store the sign date for each signature
        };
      })
    );
    
    console.log('Contract signed successfully');
    
    res.status(200).json({
      success: true,
      message: 'Contract signed successfully',
      contract: updatedContract,
      signatures: signatureDetails,
      currentUser: {
        id: req.user.id,
        username: req.user.username,
        name: req.user.name || req.user.username
      }
    });
  } catch (error) {
    console.error('Error signing contract:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export default router;
