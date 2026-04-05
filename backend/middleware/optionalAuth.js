const jwt = require('jsonwebtoken');
const { User } = require('../models');

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      const user = await User.findByPk(decoded.id);
      if (user && user.isActive) {
        req.user = user.toSafeObject();
        req.userId = user.id;
      }
      next();
    } catch (err) {
      // Ignore token errors for optional auth
      next();
    }
  } catch (error) {
    next(error);
  }
};

module.exports = optionalAuth;
