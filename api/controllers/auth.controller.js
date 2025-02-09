import User from '../models/user.model.js';
import bcryptjs from 'bcryptjs';
import { errorHandler } from '../utils/error.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import transporter from '../utils/transporter.js';

// Helper function to generate token
const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user._id,
      isRealEstateCompany: false,
      isAdmin: user.isAdmin 
    }, 
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );
};

// Helper function to set cookie
const setCookie = (res, token) => {
  res.cookie('access_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000, // 1 day
    sameSite: 'strict'
  });
};

// Regular user signin
export const signin = async (req, res, next) => {
  const { email, password } = req.body;
  
  try {
    // Find user by email
    const validUser = await User.findOne({ email });
    
    if (!validUser) {
      return next(errorHandler(404, 'User not found!'));
    }

    // Use bcrypt.compare instead of compareSync for better security
    const validPassword = await bcryptjs.compare(password, validUser.password);
    
    if (!validPassword) {
      return next(errorHandler(401, 'Invalid email or password'));
    }

    const token = generateToken(validUser);
    setCookie(res, token);
    
    const { password: pass, ...rest } = validUser._doc;
    
    res.status(200).json({
      success: true,
      access_token: token,
      ...rest
    });
  } catch (error) {
    console.error('Signin Error:', error);
    next(errorHandler(500, 'Server error during sign-in'));
  }
};

// Regular user signup
export const signup = async (req, res, next) => {
  const { username, email, password } = req.body;
  
  // Validate input
  if (!username || !email || !password) {
    return next(errorHandler(400, 'All fields are required'));
  }

  // Email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return next(errorHandler(400, 'Invalid email format'));
  }

  // Password strength validation
  if (password.length < 6) {
    return next(errorHandler(400, 'Password must be at least 6 characters long'));
  }

  try {
    // Check for existing email
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return next(errorHandler(400, 'Email already in use'));
    }

    // Check for existing username
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return next(errorHandler(400, 'Username already exists'));
    }

    // Generate a unique username if needed
    let finalUsername = username;
    if (existingUsername) {
      const randomSuffix = Math.random().toString(36).substring(7);
      finalUsername = `${username}_${randomSuffix}`;
    }

    const hashedPassword = bcryptjs.hashSync(password, 10);
    const newUser = new User({ 
      username: finalUsername, 
      email, 
      password: hashedPassword,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(finalUsername)}&background=random`
    });

    await newUser.save();
    const token = generateToken(newUser);
    setCookie(res, token);
    
    const { password: pass, ...rest } = newUser._doc;
    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      ...rest
    });
  } catch (error) {
    console.error('Signup error:', error);
    
    // Handle specific MongoDB duplicate key errors
    if (error.code === 11000) {
      const duplicateField = Object.keys(error.keyPattern)[0];
      return next(errorHandler(400, `${duplicateField} is already in use`));
    }
    
    next(error);
  }
};

// Agent signin
export const agentSignin = async (req, res, next) => {
  const { email, password } = req.body;
  try {
    const validUser = await User.findOne({ email });
    if (!validUser) return next(errorHandler(404, 'User not found!'));

    if (!validUser.isAgent) {
      return next(errorHandler(403, 'Access denied - Agent only'));
    }

    const validPassword = bcryptjs.compareSync(password, validUser.password);
    if (!validPassword) return next(errorHandler(401, 'Wrong credentials!'));

    const token = jwt.sign(
      { 
        id: validUser._id,
        isRealEstateCompany: false,
        isAgent: true 
      }, 
      process.env.JWT_SECRET
    );
    
    setCookie(res, token);
    
    const { password: pass, ...rest } = validUser._doc;
    
    res.status(200).json({
      success: true,
      access_token: token,
      ...rest
    });
  } catch (error) {
    next(error);
  }
};

// Agent signup
export const agentSignup = async (req, res, next) => {
  const { username, email, password } = req.body;
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(errorHandler(400, 'Email already exists'));
    }

    const hashedPassword = bcryptjs.hashSync(password, 10);
    const newUser = new User({ 
      username, 
      email, 
      password: hashedPassword,
      isAgent: true,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=random`
    });

    await newUser.save();
    const token = jwt.sign(
      { 
        id: newUser._id,
        isRealEstateCompany: false,
        isAgent: true 
      }, 
      process.env.JWT_SECRET
    );
    setCookie(res, token);
    
    const { password: pass, ...rest } = newUser._doc;
    res.status(201).json({
      success: true,
      ...rest
    });
  } catch (error) {
    next(error);
  }
};

// Google OAuth
export const google = async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (user) {
      const token = generateToken(user);
      setCookie(res, token);
      
      const { password: pass, ...rest } = user._doc;
      res.status(200).json({
        success: true,
        access_token: token,
        ...rest
      });
    } else {
      const generatedPassword = Math.random().toString(36).slice(-8);
      const hashedPassword = bcryptjs.hashSync(generatedPassword, 10);
      const newUser = new User({
        username: req.body.name.split(' ').join('').toLowerCase() + Math.random().toString(36).slice(-4),
        email: req.body.email,
        password: hashedPassword,
        avatar: req.body.photo
      });
      await newUser.save();
      const token = generateToken(newUser);
      setCookie(res, token);
      
      const { password: pass, ...rest } = newUser._doc;
      res.status(200).json({
        success: true,
        access_token: token,
        ...rest
      });
    }
  } catch (error) {
    next(error);
  }
};

// Forgot Password
export const forgotPassword = async (req, res, next) => {
  const { email } = req.body;

  try {
    // Validate input
    if (!email) {
      return next(errorHandler(400, 'Email is required'));
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return next(errorHandler(404, 'No account found with this email'));
    }

    // Generate 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Hash the verification code
    const hashedCode = crypto
      .createHash('sha256')
      .update(verificationCode)
      .digest('hex');

    // Set reset code and expiry
    user.resetToken = hashedCode;
    user.resetTokenExpiry = Date.now() + 15 * 60 * 1000; // 15 minutes

    await user.save();

    // Send email with verification code
    await transporter.sendMail({
      from: '"Dzimba Estate Password Reset" <academiceyeaju@gmail.com>',
      to: user.email,
      subject: 'Password Reset Verification Code',
      text: `Your password reset verification code is: ${verificationCode}. This code will expire in 15 minutes.`,
      html: `
        <h1>Password Reset Verification</h1>
        <p>Your password reset verification code is:</p>
        <h2 style="letter-spacing: 10px; font-size: 24px;">${verificationCode}</h2>
        <p>This code will expire in 15 minutes. Do not share this code with anyone.</p>
      `
    });

    res.status(200).json({
      success: true,
      message: 'Verification code sent to your email',
      email: user.email // Send email back to client to pre-fill in verification
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    next(errorHandler(500, `Error processing password reset request: ${error.message}`));
  }
};

// Sign out
export const signout = (req, res, next) => {
  try {
    res.clearCookie('access_token');
    res.status(200).json({
      success: true,
      message: 'User has been logged out!'
    });
  } catch (error) {
    next(error);
  }
};