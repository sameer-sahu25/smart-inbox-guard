const morgan = require('morgan');

// We are using morgan directly in app.js, but keeping this file 
// in case we need custom logging logic later.
const requestLogger = morgan('combined');

module.exports = requestLogger;
