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
    const userId = req.user ? req.user.id : null;
    
    console.log('Verifying code:', { code, landlordId, currentUserId: userId });
    
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
        
        // If no contract found, check if the user is an agent
        const User = (await import('../models/user.model.js')).default;
        const targetUser = await User.findById(landlordId);
        
        if (!targetUser) {
          return res.status(400).json({ 
            success: false,
            message: 'Invalid or expired code' 
          });
        }
        
        // If the user is an agent, check if they're involved in any contracts
        if (targetUser.isAgent) {
          console.log('Target user is an agent, checking contracts...');
          
          // Find contracts where this agent is involved
          const agentContracts = await Contract.find({
            $or: [
              { 'agentId': landlordId },
              { 'signatures.userId': landlordId }
            ],
            fullySignedAt: { $exists: true, $ne: null }
          });
          
          if (agentContracts.length > 0) {
            console.log('Agent is involved in contracts, checking if current user is involved...');
            
            // Check if the current user is involved in any of these contracts
            const userInvolvedInContract = agentContracts.some(contract => {
              return contract.signatures.some(signature => {
                const sigUserId = signature.userId ? 
                  (typeof signature.userId === 'object' ? signature.userId.toString() : signature.userId) : 
                  null;
                return sigUserId === userId;
              });
            });
            
            if (userInvolvedInContract) {
              console.log('Current user is involved in a contract with this agent');
              return res.status(200).json({
                success: true,
                message: 'Agent contract relationship verified successfully'
              });
            }
          }
        }
        
        return res.status(400).json({ 
          success: false,
          message: 'Invalid or expired code' 
        });
      }

      // Check if the specified user (landlordId) is involved in this contract
      // For tenant rating, landlordId is actually the tenantId
      const isUserInvolved = contract.signatures.some(signature => {
        const sigUserId = signature.userId ? 
          (typeof signature.userId === 'object' ? signature.userId.toString() : signature.userId) : 
          null;
        return sigUserId === landlordId;
      });

      // Also check if the tenant is mentioned in the contract details
      const tenantName = contract.tenantFirstname && contract.tenantSurname ? 
        `${contract.tenantFirstname} ${contract.tenantSurname}`.toLowerCase() : '';
      
      // Get user details to check if name matches
      const User = (await import('../models/user.model.js')).default;
      const userToVerify = await User.findById(landlordId);
      const userName = userToVerify ? userToVerify.username.toLowerCase() : '';
      
      // Check if tenant name in contract matches the user's name
      const nameMatches = tenantName && userName && tenantName.includes(userName);
      
      console.log('User involvement check:', { 
        isUserInvolved, 
        tenantName, 
        userName,
        nameMatches,
        landlordId: contract.landlordId ? contract.landlordId.toString() : null
      });
      
      if (!isUserInvolved && !nameMatches && contract.landlordId?.toString() !== landlordId) {
        console.log('User not involved in contract');
        return res.status(403).json({
          success: false,
          message: 'This contract is not associated with the specified user'
        });
      }

      // Verify that the current user is involved in this contract
      if (userId) {
        console.log('Checking if current user is involved. User ID:', userId);
        console.log('Signatures:', JSON.stringify(contract.signatures));
        
        const currentUserInvolved = contract.signatures.some(signature => {
          const sigUserId = signature.userId ? 
            (typeof signature.userId === 'object' ? signature.userId.toString() : signature.userId) : 
            null;
          console.log('Comparing signature userId:', sigUserId, 'with current userId:', userId);
          return sigUserId === userId;
        });

        if (!currentUserInvolved) {
          console.log('Current user not involved in contract');
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
