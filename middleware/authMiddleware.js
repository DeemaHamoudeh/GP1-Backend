const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

// Middleware to verify the token and attach user info to the request
const authenticateToken = async (req, res, next) => {
  try {
    console.log("inside authenticateToken");
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      console.log("Access denied. No token provided.");
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    console.log("arrive here");

    req.user = { id: user._id, role: user.role }; // Attach user details to the request
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ message: 'Invalid or expired token.' });
  }
};

// Middleware to check user role
const checkRole = (role) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated.' });
    }

    if (req.user.role !== role) {
      return res.status(403).json({ message: 'Access denied. Insufficient permissions.' });
    }

    next();
  };
};

module.exports = { authenticateToken, checkRole };
