const jwt = require('jsonwebtoken');
const { User } = require('../models');

const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Access denied. No token provided.' });
    }

    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Security Consideration: Tokens are now valid for 5 years.
      // This implies that unless a user is deactivated or deleted, their token remains valid.
      // In a real production environment, consider implementing:
      // 1. Token revocation (blacklist)
      // 2. Checking password changed timestamp
      // 3. Shorter access tokens with refresh tokens
      
      const user = await User.findByPk(decoded.id);
      if (!user || !user.isActive) {
        return res.status(401).json({ success: false, error: 'User account not found or deactivated.' });
      }

      req.user = user.toSafeObject();
      req.userId = user.id;
      next();
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ success: false, error: 'Token expired. Please login again.' });
      }
      return res.status(401).json({ success: false, error: 'Invalid token.' });
    }
  } catch (error) {
    next(error);
  }
};

module.exports = auth;
