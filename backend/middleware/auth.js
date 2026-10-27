const jwt = require('jsonwebtoken');
const User = require('../models/User');
const memoryStore = require('../config/memoryStore');
const mongoose = require('mongoose');

const auth = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const token = authHeader.split(' ')[1];
    if (!token || token.trim() === '') {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'devsecretjwt_99887755');
    } catch (jwtErr) {
      if (jwtErr.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Token expired, please log in again' });
      }
      return res.status(401).json({ message: 'Token is not valid' });
    }

    const userId = decoded.userId || decoded.id;
    if (!userId) {
      return res.status(401).json({ message: 'Token invalid: missing user identifier' });
    }

    let user;
    if (mongoose.connection.readyState === 1) {
      user = await User.findById(userId).select('-password');
    } else {
      user = memoryStore.users.find(u => u._id.toString() === userId.toString());
    }

    if (!user) {
      return res.status(401).json({ message: 'User not found, authorization denied' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Authentication failed' });
  }
};

module.exports = auth;
