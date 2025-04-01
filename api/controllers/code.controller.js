import Code from '../models/code.model.js';
import { errorHandler } from '../utils/error.js';

export const generateCode = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Check if user already has a valid code
    const existingCode = await Code.findOne({ 
      userId,
      expiryTime: { $gt: new Date() }
    });

    if (existingCode) {
      return res.json({
        code: existingCode.code,
        expiryTime: existingCode.expiryTime
      });
    }

    // Generate new code
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let code = '';
    
    // Ensure at least one of each type
    code += characters.charAt(Math.floor(Math.random() * 26)); // Uppercase
    code += characters.charAt(26 + Math.floor(Math.random() * 26)); // Lowercase
    code += characters.charAt(52 + Math.floor(Math.random() * 10)); // Number
    
    // Add more random characters
    for(let i = 0; i < 5; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }

    // Set expiry time to 24 hours from now
    const expiryTime = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const newCode = new Code({
      userId,
      code,
      expiryTime
    });

    await newCode.save();

    res.json({
      code: newCode.code,
      expiryTime: newCode.expiryTime
    });
  } catch (error) {
    next(error);
  }
};

export const getCode = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    const code = await Code.findOne({ 
      userId,
      expiryTime: { $gt: new Date() }
    });

    if (!code) {
      return res.status(404).json({ message: 'No valid code found' });
    }

    res.json({
      code: code.code,
      expiryTime: code.expiryTime
    });
  } catch (error) {
    next(error);
  }
};

export const verifyCode = async (req, res, next) => {
  try {
    const { code, landlordId } = req.body;
    
    console.log('Verifying code:', { code, landlordId });
    
    // First, try to verify using the standard verification code
    const verificationCode = await Code.findOne({ 
      userId: landlordId,
      code,
      expiryTime: { $gt: new Date() }
    });

    if (verificationCode) {
      console.log('Standard verification code found and valid');
      return res.json({
        success: true,
        message: 'Code verified successfully',
        expiryTime: verificationCode.expiryTime.toISOString()
      });
    }

    // If standard verification fails, try contract number verification
    try {
      console.log('Standard verification failed, trying contract number...');
      
      // Import Contract model dynamically to avoid circular dependencies
      const Contract = (await import('../models/contract.model.js')).default;
      
      // Find a fully signed contract with the given contract number
      const contract = await Contract.findOne({
        contractNumber: { $regex: new RegExp('^' + code + '$', 'i') },
        fullySignedAt: { $exists: true, $ne: null },
      });
      
      console.log('Contract search result:', contract ? 'Found' : 'Not found');
      
      if (!contract) {
        console.log('No contract found with number:', code);
        return res.status(400).json({ 
          success: false,
          message: 'Invalid or expired code' 
        });
      }

      // Verify that the landlord is involved in this contract
      console.log('Contract landlordId:', contract.landlordId, 'Requested landlordId:', landlordId);
      
      if (!contract.landlordId || contract.landlordId.toString() !== landlordId) {
        console.log('Landlord mismatch');
        return res.status(403).json({
          success: false,
          message: 'This contract is not associated with the specified landlord'
        });
      }

      // Verify that the current user is involved in this contract
      const userId = req.user ? req.user.id : null;
      console.log('Checking if user is involved. User ID:', userId);
      
      if (userId) {
        console.log('Signatures:', JSON.stringify(contract.signatures));
        
        const userInvolved = contract.signatures.some(signature => {
          const sigUserId = signature.userId ? 
            (typeof signature.userId === 'object' ? signature.userId.toString() : signature.userId) : 
            null;
          console.log('Comparing signature userId:', sigUserId, 'with current userId:', userId);
          return sigUserId === userId;
        });

        if (!userInvolved) {
          console.log('User not involved in contract');
          return res.status(403).json({
            success: false,
            message: 'You are not a party to this contract'
          });
        }
      }

      // All checks passed, return success
      console.log('Contract verification successful');
      return res.status(200).json({
        success: true,
        message: 'Contract number verified successfully',
        contractId: contract._id
      });
    } catch (contractError) {
      console.error('Error during contract verification:', contractError);
      // If there's an error during contract verification, return the standard error
      return res.status(400).json({ 
        success: false,
        message: 'Invalid or expired code' 
      });
    }
  } catch (error) {
    console.error('Verification error:', error);
    next(error);
  }
};
