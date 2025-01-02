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
    
    const verificationCode = await Code.findOne({ 
      userId: landlordId,
      code,
      expiryTime: { $gt: new Date() }
    });

    if (!verificationCode) {
      return res.status(400).json({ message: 'Invalid or expired code' });
    }

    res.json({
      success: true,
      message: 'Code verified successfully',
      expiryTime: verificationCode.expiryTime.toISOString()
    });
  } catch (error) {
    next(error);
  }
};
