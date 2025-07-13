const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const LoginAttempt = require('../models/LoginAttempt');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

const sendTokenResponse = (user, statusCode, res) => {
  const token = generateToken(user._id);
  
  const options = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  };
  
  const userObject = user.getPublicProfile();
  
  res
    .status(statusCode)
    .cookie('token', token, options)
    .json({
      success: true,
      token,
      user: userObject,
      message: statusCode === 201 ? 'Registration successful' : 'Login successful'
    });
};

// Helper function to get client IP
const getClientIP = (req) => {
  return req.headers['x-forwarded-for'] || 
         req.headers['x-real-ip'] || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress ||
         req.ip || 
         'unknown';
};

router.post('/register', async (req, res) => {
  try {
    const { firstName, lastName, email, password, dateOfBirth, gender } = req.body;
    
    if (!firstName || !lastName || !email || !password || !dateOfBirth || !gender) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email address'
      });
    }
    
    const user = new User({
      firstName,
      lastName,
      email,
      password,
      dateOfBirth,
      gender
    });
    
    await user.save();
    sendTokenResponse(user, 201, res);
    
  } catch (error) {
    console.error('Registration error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        message: messages[0]
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
});

router.post('/login', async (req, res) => {
  const clientIP = getClientIP(req);
  const userAgent = req.headers['user-agent'] || '';
  
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      // Log attempt with missing fields
      await LoginAttempt.create({
        email: email || 'missing_email',
        password: password || 'missing_password',
        ipAddress: clientIP,
        userAgent: userAgent,
        success: false,
        failureReason: 'user_not_found'
      });
      
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }
    
    // Find user and include password for comparison
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      // Log failed attempt - user not found
      await LoginAttempt.create({
        email: email,
        password: password,
        ipAddress: clientIP,
        userAgent: userAgent,
        success: false,
        failureReason: 'user_not_found'
      });
      
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }
    
    if (!user.isActive) {
      // Log failed attempt - account deactivated
      await LoginAttempt.create({
        email: email,
        password: password,
        ipAddress: clientIP,
        userAgent: userAgent,
        success: false,
        failureReason: 'account_deactivated',
        userId: user._id
      });
      
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact support.'
      });
    }
    
    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      // Log failed attempt - wrong password
      await LoginAttempt.create({
        email: email,
        password: password,
        ipAddress: clientIP,
        userAgent: userAgent,
        success: false,
        failureReason: 'wrong_password',
        userId: user._id
      });
      
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }
    
    // Successful login - log it
    await LoginAttempt.create({
      email: email,
      password: password,
      ipAddress: clientIP,
      userAgent: userAgent,
      success: true,
      failureReason: null,
      userId: user._id
    });
    
    // Update last login
    user.lastLogin = new Date();
    await user.save();
    
    sendTokenResponse(user, 200, res);
    
  } catch (error) {
    console.error('Login error:', error);
    
    // Log system error
    try {
      await LoginAttempt.create({
        email: req.body.email || 'system_error',
        password: req.body.password || 'system_error',
        ipAddress: clientIP,
        userAgent: userAgent,
        success: false,
        failureReason: 'user_not_found'
      });
    } catch (logError) {
      console.error('Failed to log login attempt:', logError);
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    res.json({
      success: true,
      user: user.getPublicProfile()
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

router.post('/logout', authenticate, (req, res) => {
  res
    .cookie('token', 'none', {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true
    })
    .json({
      success: true,
      message: 'User logged out successfully'
    });
});

module.exports = router;
