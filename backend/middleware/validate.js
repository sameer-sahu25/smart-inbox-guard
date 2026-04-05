const { body, validationResult } = require('express-validator');

const checkValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: 'Validation failed', errors: errors.array() });
  }
  next();
};

const validateRegister = [
  body('email')
    .isEmail().withMessage('Must be a valid email address')
    .normalizeEmail()
    .isLength({ max: 255 }).withMessage('Email must be less than 255 characters'),
  body('password')
    .isLength({ min: 8, max: 128 }).withMessage('Password must be between 8 and 128 characters')
    .matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('firstName')
    .optional()
    .isString()
    .isLength({ max: 50 })
    .escape(),
  body('lastName')
    .optional()
    .isString()
    .isLength({ max: 50 })
    .escape(),
  checkValidation
];

const validateLogin = [
  body('email')
    .isEmail().withMessage('Must be a valid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required'),
  checkValidation
];

const validateAnalyze = [
  body('subject')
    .optional()
    .isString()
    .isLength({ max: 500 })
    .escape(),
  body('body')
    .isString().withMessage('Body must be a string')
    .isLength({ min: 1, max: 50000 }).withMessage('Body must be between 1 and 50000 characters'),
  body('sender')
    .optional()
    .isString()
    .isLength({ max: 255 }),
  body().custom((value) => {
    if (!value.subject && !value.body) {
      throw new Error('Subject and body cannot both be empty');
    }
    return true;
  }),
  checkValidation
];

const validateFeedback = [
  body('incidentId')
    .optional()
    .isUUID().withMessage('Must be a valid UUID'),
  body('predictedLabel')
    .isIn(['safe', 'suspicious', 'spam']).withMessage('Must be one of safe, suspicious, spam'),
  body('correctLabel')
    .isIn(['safe', 'suspicious', 'spam']).withMessage('Must be one of safe, suspicious, spam'),
  body('correctionReason')
    .optional()
    .isString()
    .isLength({ max: 1000 }),
  checkValidation
];

module.exports = {
  validateRegister,
  validateLogin,
  validateAnalyze,
  validateFeedback
};
