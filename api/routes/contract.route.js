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
    
    // Create an array of pending signatures based on the contract details
    const pendingSignatures = [];
    
    // If landlord details are provided, add landlord to pendingSignatures
    if (req.body.landlordFirstname && req.body.landlordSurname) {
      // Try to find a landlord user that matches the name
      const landlordName = `${req.body.landlordFirstname} ${req.body.landlordSurname}`.toLowerCase();
      const landlord = await User.findOne({
        $or: [
          { username: { $regex: landlordName, $options: 'i' } },
          { name: { $regex: landlordName, $options: 'i' } }
        ]
      });
      
      if (landlord) {
        pendingSignatures.push(landlord._id);
        // Store the landlord ID for future reference
        req.body.landlordId = landlord._id;
      }
    }
    
    // If tenant details are provided, add tenant to pendingSignatures
    if (req.body.tenantFirstname && req.body.tenantSurname) {
      // Try to find a tenant user that matches the name
      const tenantName = `${req.body.tenantFirstname} ${req.body.tenantSurname}`.toLowerCase();
      const tenant = await User.findOne({
        $or: [
          { username: { $regex: tenantName, $options: 'i' } },
          { name: { $regex: tenantName, $options: 'i' } }
        ]
      });
      
      if (tenant) {
        pendingSignatures.push(tenant._id);
      }
    }
    
    // If agent details are provided, add agent to pendingSignatures
    if (req.body.agentFirstname && req.body.agentSurname) {
      // Try to find an agent user that matches the name
      const agentName = `${req.body.agentFirstname} ${req.body.agentSurname}`.toLowerCase();
      const agent = await User.findOne({
        isAgent: true,
        $or: [
          { username: { $regex: agentName, $options: 'i' } },
          { name: { $regex: agentName, $options: 'i' } }
        ]
      });
      
      if (agent) {
        pendingSignatures.push(agent._id);
        // Store the agent ID for future reference
        req.body.agentId = agent._id;
      }
    }
    
    // Make sure we have at least one pending signature
    if (pendingSignatures.length === 0) {
      // If we couldn't find any matching users, add a placeholder
      // This ensures the contract shows up in the "In Progress" tab
      pendingSignatures.push("placeholder");
    }
    
    const newContract = new Contract({
      ...req.body,
      senderName: req.user?.name || req.user?.username || 'Unknown Sender',
      contractUrl,
      userId: req.user.id,
      pendingSignatures, // Add the pending signatures
      fullySignedAt: null, // Explicitly set to null to ensure it's not fully signed
      userInfo: {
        name: req.user?.name || '',
        username: req.user?.username || '',
        avatar: req.user?.avatar || ''
      }
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
    console.log('Fetching contracts for user:', req.user.id);
    
    // Find contracts where the user is the sender
    const contracts = await Contract.find({ userId: req.user.id });
    
    console.log(`Found ${contracts.length} contracts for user ${req.user.id}`);
    
    // Get signature information for each contract
    const contractsWithSignatures = await Promise.all(
      contracts.map(async (contract) => {
        const contractObj = contract.toObject();
        
        // Get information about all users who have signed
        if (contractObj.signatures && contractObj.signatures.length > 0) {
          const signatureDetails = await Promise.all(
            contractObj.signatures.map(async (signature) => {
              // If signature is already an object with user info, return it
              if (typeof signature === 'object' && signature !== null && signature.userId) {
                return {
                  ...signature,
                  isCurrentUser: signature.userId.toString() === req.user.id.toString()
                };
              }
              
              // Otherwise, fetch user information
              const userId = signature;
              try {
                const user = await User.findById(userId);
                return {
                  userId: userId.toString(),
                  username: user?.username || 'Unknown User',
                  name: user?.name || user?.username || 'Unknown User',
                  avatar: user?.avatar || '',
                  isAgent: user?.isAgent || false,
                  isCurrentUser: userId.toString() === req.user.id.toString()
                };
              } catch (err) {
                console.error('Error finding user for signature:', err);
                return {
                  userId: userId.toString(),
                  username: 'Unknown User',
                  name: 'Unknown User',
                  avatar: '',
                  isCurrentUser: userId.toString() === req.user.id.toString()
                };
              }
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
              try {
                const user = await User.findById(userId);
                return {
                  userId: userId.toString(),
                  username: user?.username || 'Pending User',
                  name: user?.name || user?.username || 'Pending User',
                  avatar: user?.avatar || '',
                  isAgent: user?.isAgent || false,
                  isCurrentUser: userId.toString() === req.user.id.toString()
                };
              } catch (err) {
                console.error('Error finding user for pending signature:', err);
                return {
                  userId: userId.toString(),
                  username: 'Pending User',
                  name: 'Pending User',
                  avatar: '',
                  isCurrentUser: userId.toString() === req.user.id.toString()
                };
              }
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
            contractObj.signatures.map(async (signature) => {
              // If signature is already an object with user info, return it
              if (typeof signature === 'object' && signature !== null && signature.userId) {
                return {
                  ...signature,
                  isCurrentUser: signature.userId.toString() === req.user.id.toString()
                };
              }
              
              // Otherwise, fetch user information
              const userId = signature;
              try {
                const user = await User.findById(userId);
                return {
                  userId: userId.toString(),
                  username: user?.username || 'Unknown User',
                  name: user?.name || user?.username || 'Unknown User',
                  avatar: user?.avatar || '',
                  isAgent: user?.isAgent || false,
                  isCurrentUser: userId.toString() === req.user.id.toString()
                };
              } catch (err) {
                console.error('Error finding user for signature:', err);
                return {
                  userId: userId.toString(),
                  username: 'Unknown User',
                  name: 'Unknown User',
                  avatar: '',
                  isCurrentUser: userId.toString() === req.user.id.toString()
                };
              }
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
              try {
                const user = await User.findById(userId);
                return {
                  userId: userId.toString(),
                  username: user?.username || 'Pending User',
                  name: user?.name || user?.username || 'Pending User',
                  avatar: user?.avatar || '',
                  isAgent: user?.isAgent || false,
                  isCurrentUser: userId.toString() === req.user.id.toString()
                };
              } catch (err) {
                console.error('Error finding user for pending signature:', err);
                return {
                  userId: userId.toString(),
                  username: 'Pending User',
                  name: 'Pending User',
                  avatar: '',
                  isCurrentUser: userId.toString() === req.user.id.toString()
                };
              }
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
    console.log('Fetching contracts needing signature for user:', req.user.id, 'isAgent:', req.user.isAgent);
    
    let contracts = [];
    
    // Find contracts where the user's ID is in the pendingSignatures array
    const pendingSignatureContracts = await Contract.find({
      pendingSignatures: { $in: [req.user.id, req.user._id?.toString()] },
      fullySignedAt: null // Only include contracts that aren't fully signed
    });
    
    console.log(`Found ${pendingSignatureContracts.length} contracts with user in pendingSignatures`);
    contracts = [...pendingSignatureContracts];
    
    // For agents, also find contracts where they are the agent but not explicitly in pendingSignatures
    if (req.user.isAgent) {
      console.log('User is an agent, checking for agent-specific contracts');
      
      // Get the agent's name components for matching
      const userFirstName = req.user.name?.split(' ')[0] || '';
      const userLastName = req.user.name?.split(' ').slice(1).join(' ') || '';
      const username = req.user.username || '';
      
      // Find contracts where the agent is specified but not in pendingSignatures
      const agentContracts = await Contract.find({
        $and: [
          // Not already in the list of contracts
          { _id: { $nin: contracts.map(c => c._id) } },
          // Not fully signed
          { fullySignedAt: null },
          // Has pending signatures (still needs signatures)
          { pendingSignatures: { $exists: true, $ne: [] } },
          // Either the agentId matches or the agent name fields match
          { $or: [
            // Agent ID matches
            { agentId: req.user.id },
            // Agent name fields match (case insensitive)
            { $and: [
              { agentFirstname: { $regex: userFirstName, $options: 'i' } },
              { agentSurname: { $regex: userLastName, $options: 'i' } }
            ]},
            // Username matches agent firstname (for partial matches)
            { agentFirstname: { $regex: username, $options: 'i' } }
          ]},
          // Check that the agent has NOT already signed
          { 
            $nor: [
              // Not in signatures as a string ID
              { signatures: req.user.id },
              // Not in signatures as an object with userId
              { "signatures.userId": req.user.id },
              // Not in signatures as an object with isAgent=true
              { "signatures.isAgent": true }
            ]
          }
        ]
      });
      
      console.log(`Found ${agentContracts.length} additional agent-specific contracts`);
      
      // Add these contracts to the result
      contracts = [...contracts, ...agentContracts];
    }
    
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
        
        // Get information about all users who have signed
        if (contractObj.signatures && contractObj.signatures.length > 0) {
          const signatureDetails = await Promise.all(
            contractObj.signatures.map(async (signature) => {
              // If signature is already an object with user info, return it
              if (typeof signature === 'object' && signature !== null && signature.userId) {
                return {
                  ...signature,
                  isCurrentUser: signature.userId.toString() === req.user.id.toString()
                };
              }
              
              // Otherwise, fetch user information
              const userId = signature;
              try {
                const user = await User.findById(userId);
                return {
                  userId: userId.toString(),
                  username: user?.username || 'Unknown User',
                  name: user?.name || user?.username || 'Unknown User',
                  avatar: user?.avatar || '',
                  isAgent: user?.isAgent || false,
                  isCurrentUser: userId.toString() === req.user.id.toString()
                };
              } catch (err) {
                console.error('Error finding user for signature:', err);
                return {
                  userId: userId.toString(),
                  username: 'Unknown User',
                  name: 'Unknown User',
                  avatar: '',
                  isCurrentUser: userId.toString() === req.user.id.toString()
                };
              }
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
              try {
                const user = await User.findById(userId);
                return {
                  userId: userId.toString(),
                  username: user?.username || 'Pending User',
                  name: user?.name || user?.username || 'Pending User',
                  avatar: user?.avatar || '',
                  isAgent: user?.isAgent || false,
                  isCurrentUser: userId.toString() === req.user.id.toString()
                };
              } catch (err) {
                console.error('Error finding user for pending signature:', err);
                return {
                  userId: userId.toString(),
                  username: 'Pending User',
                  name: 'Pending User',
                  avatar: '',
                  isCurrentUser: userId.toString() === req.user.id.toString()
                };
              }
            })
          );
          contractObj.pendingSignatures = pendingSignatureDetails;
        } else {
          contractObj.pendingSignatures = [];
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
    console.log('Fetching count of contracts needing signature for user:', req.user.id, 'isAgent:', req.user.isAgent);
    
    // Find contracts where the user's ID is in the pendingSignatures array
    // Using $in operator to handle potential format differences
    const pendingSignatureCount = await Contract.countDocuments({
      pendingSignatures: { $in: [req.user.id, req.user._id?.toString()] },
      fullySignedAt: null // Only include contracts that aren't fully signed
    });
    
    let totalCount = pendingSignatureCount;
    
    // For agents, also count contracts where they are the agent but not explicitly in pendingSignatures
    if (req.user.isAgent) {
      console.log('User is an agent, checking for agent-specific contracts count');
      
      // Get the agent's name components for matching
      const userFirstName = req.user.name?.split(' ')[0] || '';
      const userLastName = req.user.name?.split(' ').slice(1).join(' ') || '';
      const username = req.user.username || '';
      
      // Find contracts where the agent is specified but not in pendingSignatures
      const agentContractsCount = await Contract.countDocuments({
        $and: [
          // Not already counted
          { _id: { $nin: await Contract.find({ pendingSignatures: { $in: [req.user.id, req.user._id?.toString()] }, fullySignedAt: null }).select('_id') } },
          // Not fully signed
          { fullySignedAt: null },
          // Has pending signatures (still needs signatures)
          { pendingSignatures: { $exists: true, $ne: [] } },
          // Either the agentId matches or the agent name fields match
          { $or: [
            // Agent ID matches
            { agentId: req.user.id },
            // Agent name fields match (case insensitive)
            { $and: [
              { agentFirstname: { $regex: userFirstName, $options: 'i' } },
              { agentSurname: { $regex: userLastName, $options: 'i' } }
            ]},
            // Username matches agent firstname (for partial matches)
            { agentFirstname: { $regex: username, $options: 'i' } }
          ]}
        ]
      });
      
      console.log(`Found ${agentContractsCount} additional agent-specific contracts`);
      totalCount += agentContractsCount;
    }
    
    console.log(`Total contracts needing signature: ${totalCount}`);
    
    res.status(200).json({ count: totalCount });
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
    // or where there's an object signature with the user's ID
    const contracts = await Contract.find({
      $or: [
        // Check for string-based signatures
        { signatures: { $in: [req.user.id] } },
        // Check for object-based signatures with userId
        { "signatures.userId": req.user.id },
        // For agents, also check for signatures with isAgent=true
        ...(req.user.isAgent ? [{ "signatures.isAgent": true }] : [])
      ]
    });
    
    console.log(`Found ${contracts.length} contracts signed by user ${req.user.id}`);
    
    // Get signature information for each contract
    const contractsWithSignatures = await Promise.all(
      contracts.map(async (contract) => {
        const contractObj = contract.toObject();
        
        // Get information about all users who have signed
        if (contractObj.signatures && contractObj.signatures.length > 0) {
          const signatureDetails = await Promise.all(
            contractObj.signatures.map(async (signature) => {
              // If signature is already an object with user info, return it
              if (typeof signature === 'object' && signature !== null && signature.userId) {
                return {
                  ...signature,
                  isCurrentUser: signature.userId.toString() === req.user.id.toString()
                };
              }
              
              // Otherwise, fetch user information
              const userId = signature;
              try {
                const user = await User.findById(userId);
                return {
                  userId: userId.toString(),
                  username: user?.username || 'Unknown User',
                  name: user?.name || user?.username || 'Unknown User',
                  avatar: user?.avatar || '',
                  isAgent: user?.isAgent || false,
                  isCurrentUser: userId.toString() === req.user.id.toString()
                };
              } catch (err) {
                console.error('Error finding user for signature:', err);
                return {
                  userId: userId.toString(),
                  username: 'Unknown User',
                  name: 'Unknown User',
                  avatar: '',
                  isCurrentUser: userId.toString() === req.user.id.toString()
                };
              }
            })
          );
          contractObj.signatures = signatureDetails;
        } else {
          contractObj.signatures = [];
        }
        
        return contractObj;
      })
    );
    
    res.status(200).json(contractsWithSignatures);
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
          senderAvatar: sender.avatar || '',
          isCurrentUserSender: contract.userId === req.user.id
        };
      }
    }
    
    // Get information about all users who have signed
    const signatureDetails = await Promise.all(
      (contract.signatures || []).map(async (signature) => {
        // If signature is already an object with user info, return it
        if (typeof signature === 'object' && signature !== null && signature.userId) {
          return {
            ...signature,
            isCurrentUser: signature.userId.toString() === req.user.id.toString()
          };
        }
        
        // Otherwise, fetch user information
        const userId = signature;
        try {
          const user = await User.findById(userId);
          return {
            userId: userId.toString(),
            username: user?.username || 'Unknown User',
            name: user?.name || user?.username || 'Unknown User',
            avatar: user?.avatar || '',
            isAgent: user?.isAgent || false,
            isCurrentUser: userId.toString() === req.user.id.toString()
          };
        } catch (err) {
          console.error('Error finding user for signature:', err);
          return {
            userId: userId.toString(),
            username: 'Unknown User',
            name: 'Unknown User',
            avatar: '',
            isCurrentUser: userId.toString() === req.user.id.toString()
          };
        }
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
      userObjectId: req.user._id?.toString(),
      isAgent: req.user.isAgent
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
      signatures: contract.signatures,
      agentId: contract.agentId,
      agentFirstname: contract.agentFirstname,
      agentSurname: contract.agentSurname
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
    
    // Special handling for agents - check if they are the agent for this contract
    let isAgentForContract = false;
    if (req.user.isAgent) {
      console.log('User is an agent, checking if they are the agent for this contract');
      
      // Check if agent ID matches
      if (contract.agentId && 
          (contract.agentId.toString() === userIdString || 
           contract.agentId.toString() === userIdObjectString)) {
        console.log('Agent ID matches contract agentId');
        isAgentForContract = true;
      } else {
        // Check if agent name matches
        const userFirstName = req.user.name?.split(' ')[0] || '';
        const userLastName = req.user.name?.split(' ').slice(1).join(' ') || '';
        const username = req.user.username || '';
        
        console.log('Checking agent name match:', {
          userFirstName,
          userLastName,
          username,
          contractAgentFirstname: contract.agentFirstname,
          contractAgentSurname: contract.agentSurname
        });
        
        // Check if agent name matches contract agent fields (case insensitive)
        if (contract.agentFirstname || contract.agentSurname) {
          const isAgentNameMatch = 
            (userFirstName && contract.agentFirstname && 
             contract.agentFirstname.toLowerCase().includes(userFirstName.toLowerCase())) ||
            (userLastName && contract.agentSurname && 
             contract.agentSurname.toLowerCase().includes(userLastName.toLowerCase())) ||
            (username && contract.agentFirstname && 
             contract.agentFirstname.toLowerCase().includes(username.toLowerCase()));
             
          if (isAgentNameMatch) {
            console.log('Agent name matches contract agent fields');
            isAgentForContract = true;
          }
        }
      }
    }
    
    // Allow signing if user is in pendingSignatures OR is an agent for this contract
    if (!userIdInPendingSignatures && !isAgentForContract) {
      console.log('Authorization failed. User not in pendingSignatures and not the agent for this contract');
      return res.status(403).json({ message: 'You are not authorized to sign this contract' });
    }
    
    console.log('User authorized to sign contract');
    
    // Remove user from pendingSignatures and add to signatures
    const updatedPendingSignatures = contract.pendingSignatures.filter(id => {
      const pendingIdString = id.toString();
      return pendingIdString !== userIdString && pendingIdString !== userIdObjectString;
    });
    
    // Check if user already signed
    const userAlreadySigned = (contract.signatures || []).some(sig => {
      if (typeof sig === 'object' && sig !== null) {
        return sig.userId === userIdString || sig.userId === userIdObjectString;
      }
      const signatureIdString = sig.toString();
      return signatureIdString === userIdString || signatureIdString === userIdObjectString;
    });
    
    // Only add to signatures if not already signed
    let updatedSignatures = [...(contract.signatures || [])];
    if (!userAlreadySigned) {
      // Add user signature with additional information
      const userSignature = {
        userId: req.user.id,
        name: req.user.name || req.user.username || 'Unknown User',
        username: req.user.username || '',
        avatar: req.user.avatar || '',
        isAgent: req.user.isAgent || false,
        signedAt: new Date()
      };
      
      updatedSignatures.push(userSignature);
    }
    
    // Check if all required signatures are collected
    let fullySignedAt = contract.fullySignedAt;
    let contractNumber = contract.contractNumber;
    if (updatedPendingSignatures.length === 0) {
      fullySignedAt = new Date();
      
      // Generate a unique contract number if not already generated
      if (!contractNumber) {
        // Format: PROP-YYYY-MM-XXXXX (where XXXXX is a random alphanumeric string)
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        
        // Generate a random alphanumeric string (3 letters + 4 numbers)
        const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // Removed I and O to avoid confusion with 1 and 0
        const randomLetters = Array(3).fill().map(() => alphabet.charAt(Math.floor(Math.random() * alphabet.length))).join('');
        const randomDigits = Math.floor(1000 + Math.random() * 9000); // 4-digit random number
        
        // Take the first 3 characters of the property name (or less if shorter)
        const propertyPrefix = contract.property.replace(/[^a-zA-Z0-9]/g, '').substring(0, 3).toUpperCase();
        
        contractNumber = `${propertyPrefix}-${randomLetters}${randomDigits}-${year}${month}`;
      }
    }
    
    console.log('Updating contract with:', {
      updatedPendingSignatures,
      updatedSignatures,
      fullySignedAt,
      contractNumber
    });
    
    try {
      // Update the contract
      const updatedContract = await Contract.findByIdAndUpdate(
        contractId,
        { 
          pendingSignatures: updatedPendingSignatures,
          signatures: updatedSignatures,
          fullySignedAt,
          contractNumber
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
        updatedSignatures.map(async (signature) => {
          // If signature is already an object with user info, return it
          if (typeof signature === 'object' && signature !== null && signature.userId) {
            return {
              ...signature,
              isCurrentUser: signature.userId.toString() === req.user.id.toString()
            };
          }
          
          // Otherwise, fetch user information
          const userId = signature;
          try {
            const user = await User.findById(userId);
            return {
              userId: userId.toString(),
              username: user?.username || 'Unknown User',
              name: user?.name || user?.username || 'Unknown User',
              avatar: user?.avatar || '',
              isAgent: user?.isAgent || false,
              isCurrentUser: userId.toString() === req.user.id.toString()
            };
          } catch (err) {
            console.error('Error finding user for signature:', err);
            return {
              userId: userId.toString(),
              username: 'Unknown User',
              name: 'Unknown User',
              avatar: '',
              isCurrentUser: userId.toString() === req.user.id.toString()
            };
          }
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
  } catch (error) {
    console.error('Error signing contract:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get all fully signed contracts involving the user (either as sender or signer)
router.get('/fully-signed', verifyToken, async (req, res) => {
  try {
    console.log('Fetching fully signed contracts for user:', req.user.id);
    
    // Find contracts where the user is either the sender or a signer, and that are fully signed
    const contracts = await Contract.find({
      $or: [
        { userId: req.user.id }, // User is the sender
        { signatures: { $in: [req.user.id] } } // User is a signer
      ],
      $and: [
        { $or: [
          { fullySignedAt: { $exists: true, $ne: null } }, // Has fullySignedAt timestamp
          { pendingSignatures: { $size: 0 } } // Or no pending signatures
        ]}
      ]
    });
    
    console.log(`Found ${contracts.length} fully signed contracts involving user ${req.user.id}`);
    
    // Get signature information for each contract
    const contractsWithDetails = await Promise.all(
      contracts.map(async (contract) => {
        const contractObj = contract.toObject();
        
        // Get sender information
        let senderInfo = {};
        if (contractObj.userId) {
          const sender = await User.findById(contractObj.userId);
          if (sender) {
            senderInfo = {
              senderName: sender.username || 'Unknown User',
              senderAvatar: sender.avatar || '',
              isCurrentUserSender: contractObj.userId === req.user.id
            };
          }
        }
        
        // Get information about all users who have signed
        if (contractObj.signatures && contractObj.signatures.length > 0) {
          const signatureDetails = await Promise.all(
            contractObj.signatures.map(async (signature) => {
              // If signature is already an object with user info, return it
              if (typeof signature === 'object' && signature !== null && signature.userId) {
                return {
                  ...signature,
                  isCurrentUser: signature.userId.toString() === req.user.id.toString()
                };
              }
              
              // Otherwise, fetch user information
              const userId = signature;
              try {
                const user = await User.findById(userId);
                return {
                  userId: userId.toString(),
                  username: user?.username || 'Unknown User',
                  name: user?.name || user?.username || 'Unknown User',
                  avatar: user?.avatar || '',
                  isAgent: user?.isAgent || false,
                  isCurrentUser: userId.toString() === req.user.id.toString()
                };
              } catch (err) {
                console.error('Error finding user for signature:', err);
                return {
                  userId: userId.toString(),
                  username: 'Unknown User',
                  name: 'Unknown User',
                  avatar: '',
                  isCurrentUser: userId.toString() === req.user.id.toString()
                };
              }
            })
          );
          contractObj.signatures = signatureDetails;
        } else {
          contractObj.signatures = [];
        }
        
        return {
          ...contractObj,
          ...senderInfo
        };
      })
    );
    
    res.status(200).json(contractsWithDetails);
  } catch (error) {
    console.error('Error fetching fully signed contracts:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get contracts where the current user is an agent
router.get('/agent-contracts', verifyToken, async (req, res) => {
  try {
    console.log('Fetching contracts for agent:', req.user.id, 'isAgent:', req.user.isAgent);
    
    // Verify the user is an agent
    if (!req.user.isAgent) {
      return res.status(403).json({ message: 'Only agents can access this endpoint' });
    }
    
    // Find contracts by agent ID
    const contractsByAgentId = await Contract.find({
      agentId: req.user.id
    });
    
    console.log(`Found ${contractsByAgentId.length} contracts by agentId match`);
    
    // Get the agent's name components for matching
    const userFirstName = req.user.name?.split(' ')[0] || '';
    const userLastName = req.user.name?.split(' ').slice(1).join(' ') || '';
    const username = req.user.username || '';
    
    // Find contracts by agent name (case insensitive)
    const contractsByAgentName = await Contract.find({
      $and: [
        // Not already found by agent ID
        { _id: { $nin: contractsByAgentId.map(c => c._id) } },
        // Either first name or last name matches
        { $or: [
          // First name matches (case insensitive)
          { agentFirstname: { $regex: userFirstName, $options: 'i' } },
          // Last name matches (case insensitive)
          { agentSurname: { $regex: userLastName, $options: 'i' } },
          // Username matches agent firstname (for partial matches)
          { agentFirstname: { $regex: username, $options: 'i' } }
        ]}
      ]
    });
    
    console.log(`Found ${contractsByAgentName.length} contracts by agent name match`);
    
    // Find contracts where the agent is in pendingSignatures or signatures
    const contractsInvolvingAgent = await Contract.find({
      $and: [
        // Not already found by agent ID or name
        { 
          _id: { 
            $nin: [...contractsByAgentId.map(c => c._id), 
                  ...contractsByAgentName.map(c => c._id)] 
          } 
        },
        // Agent is in pendingSignatures or signatures
        { $or: [
          { pendingSignatures: { $in: [req.user.id, req.user._id?.toString()] } },
          { signatures: { $in: [req.user.id, req.user._id?.toString()] } }
        ]}
      ]
    });
    
    console.log(`Found ${contractsInvolvingAgent.length} contracts where agent is in signatures/pendingSignatures`);
    
    // Combine all contracts
    const allAgentContracts = [
      ...contractsByAgentId,
      ...contractsByAgentName,
      ...contractsInvolvingAgent
    ];
    
    console.log(`Total agent contracts: ${allAgentContracts.length}`);
    
    // Get signature information for each contract
    const contractsWithSignatures = await Promise.all(
      allAgentContracts.map(async (contract) => {
        const contractObj = contract.toObject();
        
        // Get sender information
        if (contractObj.userId) {
          try {
            const sender = await User.findById(contractObj.userId);
            if (sender) {
              contractObj.senderName = sender.name || sender.username || 'Unknown Sender';
              contractObj.senderAvatar = sender.avatar || '';
              contractObj.isCurrentUserSender = contractObj.userId === req.user.id;
            }
          } catch (err) {
            console.error('Error finding sender:', err);
          }
        }
        
        // Get information about all users who have signed
        if (contractObj.signatures && contractObj.signatures.length > 0) {
          const signatureDetails = await Promise.all(
            contractObj.signatures.map(async (signature) => {
              // If signature is already an object with user info, return it
              if (typeof signature === 'object' && signature !== null && signature.userId) {
                return {
                  ...signature,
                  isCurrentUser: signature.userId.toString() === req.user.id.toString()
                };
              }
              
              // Otherwise, fetch user information
              const userId = signature;
              try {
                const user = await User.findById(userId);
                return {
                  userId: userId.toString(),
                  username: user?.username || 'Unknown User',
                  name: user?.name || user?.username || 'Unknown User',
                  avatar: user?.avatar || '',
                  isAgent: user?.isAgent || false,
                  isCurrentUser: userId.toString() === req.user.id.toString()
                };
              } catch (err) {
                console.error('Error finding user for signature:', err);
                return {
                  userId: userId.toString(),
                  username: 'Unknown User',
                  name: 'Unknown User',
                  avatar: '',
                  isCurrentUser: userId.toString() === req.user.id.toString()
                };
              }
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
              try {
                const user = await User.findById(userId);
                return {
                  userId: userId.toString(),
                  username: user?.username || 'Pending User',
                  name: user?.name || user?.username || 'Pending User',
                  avatar: user?.avatar || '',
                  isAgent: user?.isAgent || false,
                  isCurrentUser: userId.toString() === req.user.id.toString()
                };
              } catch (err) {
                console.error('Error finding user for pending signature:', err);
                return {
                  userId: userId.toString(),
                  username: 'Pending User',
                  name: 'Pending User',
                  avatar: '',
                  isCurrentUser: userId.toString() === req.user.id.toString()
                };
              }
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
    console.error('Error fetching agent contracts:', error);
    res.status(500).json({ message: error.message });
  }
});

// Verify a contract by its contract number for rating verification
router.post('/verify-by-number', verifyToken, async (req, res) => {
  try {
    const { contractNumber, landlordId } = req.body;
    
    console.log('Verifying contract by number:', { contractNumber, landlordId, userId: req.user.id });
    
    if (!contractNumber || !landlordId) {
      return res.status(400).json({
        success: false,
        message: 'Contract number and landlord ID are required'
      });
    }

    // Find a fully signed contract with the given contract number
    // Use case-insensitive search to handle different capitalizations
    const contract = await Contract.findOne({
      contractNumber: { $regex: new RegExp('^' + contractNumber + '$', 'i') },
      fullySignedAt: { $exists: true, $ne: null },
    });

    console.log('Contract search result:', contract ? 'Found' : 'Not found');
    
    if (!contract) {
      // Try searching without exact match (in case there are slight format differences)
      const allContracts = await Contract.find({
        fullySignedAt: { $exists: true, $ne: null }
      });
      
      console.log('All fully signed contracts count:', allContracts.length);
      
      if (allContracts.length > 0) {
        console.log('Sample contract numbers:', allContracts.slice(0, 3).map(c => c.contractNumber));
      }
      
      return res.status(404).json({
        success: false,
        message: 'No fully signed contract found with this number'
      });
    }

    // Verify that the landlord is involved in this contract
    console.log('Contract landlordId:', contract.landlordId, 'Requested landlordId:', landlordId);
    
    if (!contract.landlordId || contract.landlordId.toString() !== landlordId) {
      return res.status(403).json({
        success: false,
        message: 'This contract is not associated with the specified landlord'
      });
    }

    // Verify that the current user is involved in this contract
    const userId = req.user.id;
    console.log('Checking if user is involved. User ID:', userId);
    console.log('Signatures:', JSON.stringify(contract.signatures));
    
    const userInvolved = contract.signatures.some(signature => {
      const sigUserId = signature.userId ? 
        (typeof signature.userId === 'object' ? signature.userId.toString() : signature.userId) : 
        null;
      console.log('Comparing signature userId:', sigUserId, 'with current userId:', userId);
      return sigUserId === userId;
    });

    if (!userInvolved) {
      return res.status(403).json({
        success: false,
        message: 'You are not a party to this contract'
      });
    }

    // All checks passed, return success
    console.log('Contract verification successful');
    return res.status(200).json({
      success: true,
      message: 'Contract verified successfully',
      contractId: contract._id
    });
  } catch (error) {
    console.error('Error verifying contract by number:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'An error occurred while verifying the contract'
    });
  }
});

export default router;
