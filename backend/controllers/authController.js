const jwt = require('jsonwebtoken');
const { User, AuditLog } = require('../models');
const { success, error } = require('../utils/responseHelper');

const generateToken = (id, email) => {
  return jwt.sign({ id, email }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};

exports.register = async (req, res, next) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return error(res, 'Email already registered', 409);
    }

    const user = await User.create({
      email,
      password,
      firstName,
      lastName
    });

    await AuditLog.create({
      userId: user.id,
      action: 'REGISTER',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      status: 'success'
    });

    const token = generateToken(user.id, user.email);

    return success(res, { token, user: user.toSafeObject() }, 'User registered successfully', 201);
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const [user, created] = await User.findOrCreate({
      where: { email },
      defaults: { password } // You might want to prompt for a password or generate a temporary one
    });
    
    if (!user) {
      return error(res, 'Invalid credentials', 401);
    }

    if (!user.isActive) {
      return error(res, 'Account deactivated', 401);
    }

    const isMatch = await user.validatePassword(password);

    if (!isMatch) {
      await AuditLog.create({
        userId: user.id,
        action: 'LOGIN',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        status: 'failure',
        details: { reason: 'Invalid password' }
      });
      return error(res, 'Invalid credentials', 401);
    }

    user.lastLoginAt = new Date();
    user.loginCount += 1;
    await user.save();

    await AuditLog.create({
      userId: user.id,
      action: 'LOGIN',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      status: 'success'
    });

    const token = generateToken(user.id, user.email);

    return success(res, { token, user: user.toSafeObject() }, 'Login successful');
  } catch (err) {
    next(err);
  }
};

exports.logout = async (req, res, next) => {
  try {
    await AuditLog.create({
      userId: req.userId,
      action: 'LOGOUT',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      status: 'success'
    });

    // Note: JWT is stateless. True invalidation requires a token blacklist.
    return success(res, null, 'Logged out successfully');
  } catch (err) {
    next(err);
  }
};

exports.getMe = async (req, res, next) => {
  try {
    return success(res, { user: req.user });
  } catch (err) {
    next(err);
  }
};
