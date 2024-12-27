import User from '../models/user.model.js';
import bcryptjs from 'bcryptjs';
import { errorHandler } from '../utils/error.js';
import jwt from 'jsonwebtoken';

// Helper function to generate token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '1d',
  });
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
    const validUser = await User.findOne({ email });
    if (!validUser) return next(errorHandler(404, 'User not found!'));

    const validPassword = bcryptjs.compareSync(password, validUser.password);
    if (!validPassword) return next(errorHandler(401, 'Wrong credentials!'));

    const token = jwt.sign({ id: validUser._id }, process.env.JWT_SECRET);
    const { password: pass, ...rest } = validUser._doc;

    res
      .cookie('access_token', token, { httpOnly: true })
      .status(200)
      .json({
        success: true,
        user: rest,
      });
  } catch (error) {
    next(error);
  }
};

// Regular user signup
export const signup = async (req, res, next) => {
  const { username, email, password } = req.body;
  try {
    const hashedPassword = bcryptjs.hashSync(password, 10);
    const newUser = new User({ username, email, password: hashedPassword });
    await newUser.save();
    res.status(201).json({ success: true, message: 'User created successfully!' });
  } catch (error) {
    next(error);
  }
};

// Agent signin
export const agentSignin = async (req, res, next) => {
  const { email, password } = req.body;
  
  try {
    console.log('Agent signin attempt:', { email });

    const validUser = await User.findOne({ email });
    if (!validUser) {
      console.log('No user found with email:', email);
      return next(errorHandler(404, 'User not found'));
    }

    if (!validUser.isAgent) {
      console.log('User is not an agent:', email);
      return next(errorHandler(403, 'Access denied - Agent only'));
    }

    const validPassword = bcryptjs.compareSync(password, validUser.password);
    if (!validPassword) {
      console.log('Invalid password for agent:', email);
      return next(errorHandler(401, 'Wrong credentials'));
    }

    const token = jwt.sign({ id: validUser._id }, process.env.JWT_SECRET);
    console.log('Generated token for agent:', { 
      agentId: validUser._id,
      tokenExists: !!token 
    });

    const { password: pass, ...rest } = validUser._doc;

    res
      .cookie('access_token', token, { httpOnly: true })
      .status(200)
      .json({
        success: true,
        user: {
          ...rest,
          isAgent: true,
          token
        }
      });
  } catch (error) {
    console.error('Error in agentSignin:', error);
    next(error);
  }
};

// Agent signup
export const agentSignup = async (req, res, next) => {
  const { username, email, password } = req.body;
  
  try {
    console.log('Agent signup attempt:', { email });

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('Email already exists:', email);
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
    console.log('New agent created:', { agentId: newUser._id });

    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET);
    const { password: pass, ...rest } = newUser._doc;

    res
      .cookie('access_token', token, { httpOnly: true })
      .status(201)
      .json({
        success: true,
        user: {
          ...rest,
          isAgent: true,
          token
        }
      });
  } catch (error) {
    console.error('Error in agentSignup:', error);
    next(error);
  }
};

export const google = async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (user) {
      const token = generateToken(user._id);
      setCookie(res, token);
      const { password: pass, ...rest } = user._doc;
      res.status(200).json({
        success: true,
        user: rest,
        token
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
      const token = generateToken(newUser._id);
      setCookie(res, token);
      const { password: pass, ...rest } = newUser._doc;
      res.status(200).json({
        success: true,
        user: rest,
        token
      });
    }
  } catch (error) {
    console.error('Error in google:', error);
    next(error);
  }
};

export const signout = async (req, res, next) => {
  try {
    res.clearCookie('access_token');
    res.status(200).json({ success: true, message: 'User has been logged out!' });
  } catch (error) {
    next(error);
  }
};