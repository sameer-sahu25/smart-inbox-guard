const errorHandler = (err, req, res, next) => {
  const isDev = process.env.NODE_ENV === 'development';
  
  if (isDev) {
    console.error(err.stack);
  }

  // Sequelize Validation Error
  if (err.name === 'SequelizeValidationError') {
    const errors = err.errors.map(e => ({ field: e.path, message: e.message }));
    return res.status(400).json({ 
      success: false, 
      error: 'Validation error', 
      errors,
      ...(isDev ? { stack: err.stack } : {})
    });
  }

  // Sequelize Unique Constraint Error
  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({ 
      success: false, 
      error: 'Resource already exists',
      ...(isDev ? { stack: err.stack } : {})
    });
  }

  // Sequelize Connection Error
  if (err.name === 'SequelizeConnectionError') {
    return res.status(503).json({ 
      success: false, 
      error: 'Database service unavailable',
      ...(isDev ? { stack: err.stack } : {})
    });
  }

  // JWT Errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ 
      success: false, 
      error: 'Invalid token',
      ...(isDev ? { stack: err.stack } : {})
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ 
      success: false, 
      error: 'Token expired',
      ...(isDev ? { stack: err.stack } : {})
    });
  }

  // JSON Parsing Error
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ 
      success: false, 
      error: 'Malformed JSON payload',
      ...(isDev ? { stack: err.stack } : {})
    });
  }

  // Default Server Error
  res.status(500).json({ 
    success: false, 
    error: isDev ? err.message : 'Internal server error',
    ...(isDev ? { stack: err.stack } : {})
  });
};

module.exports = errorHandler;
