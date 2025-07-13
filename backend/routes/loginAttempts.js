const express = require('express');
const LoginAttempt = require('../models/LoginAttempt');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Get all login attempts (admin only)
router.get('/all', async (req, res) => {
  try {
    const attempts = await LoginAttempt.find()
      .populate('userId', 'firstName lastName email')
      .sort({ timestamp: -1 })
      .limit(1000); // Limit to last 1000 attempts
    
    res.json({
      success: true,
      count: attempts.length,
      attempts: attempts
    });
  } catch (error) {
    console.error('Get login attempts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get login attempts by email
router.get('/by-email/:email', async (req, res) => {
  try {
    const attempts = await LoginAttempt.find({ 
      email: req.params.email.toLowerCase() 
    })
    .populate('userId', 'firstName lastName email')
    .sort({ timestamp: -1 })
    .limit(100);
    
    res.json({
      success: true,
      count: attempts.length,
      attempts: attempts
    });
  } catch (error) {
    console.error('Get login attempts by email error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get failed login attempts
router.get('/failed', async (req, res) => {
  try {
    const attempts = await LoginAttempt.find({ success: false })
      .populate('userId', 'firstName lastName email')
      .sort({ timestamp: -1 })
      .limit(500);
    
    res.json({
      success: true,
      count: attempts.length,
      attempts: attempts
    });
  } catch (error) {
    console.error('Get failed login attempts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get login statistics
router.get('/stats', async (req, res) => {
  try {
    const totalAttempts = await LoginAttempt.countDocuments();
    const successfulAttempts = await LoginAttempt.countDocuments({ success: true });
    const failedAttempts = await LoginAttempt.countDocuments({ success: false });
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayAttempts = await LoginAttempt.countDocuments({
      timestamp: { $gte: today }
    });
    
    const uniqueIPs = await LoginAttempt.distinct('ipAddress');
    const uniqueEmails = await LoginAttempt.distinct('email');
    
    res.json({
      success: true,
      stats: {
        totalAttempts,
        successfulAttempts,
        failedAttempts,
        successRate: totalAttempts > 0 ? ((successfulAttempts / totalAttempts) * 100).toFixed(2) : 0,
        todayAttempts,
        uniqueIPs: uniqueIPs.length,
        uniqueEmails: uniqueEmails.length
      }
    });
  } catch (error) {
    console.error('Get login stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;
