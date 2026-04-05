const jwt = require('jsonwebtoken');
require('dotenv').config();

const testTokenExp = () => {
  const payload = { id: 'test-user-id', email: 'test@example.com' };
  const secret = process.env.JWT_SECRET || 'test-secret';
  const expiresIn = process.env.JWT_EXPIRES_IN || '1825d';

  console.log(`Generating token with expiresIn: ${expiresIn}`);
  
  const token = jwt.sign(payload, secret, { expiresIn });
  const decoded = jwt.decode(token);
  
  const iat = decoded.iat;
  const exp = decoded.exp;
  const durationInSeconds = exp - iat;
  const durationInDays = durationInSeconds / (24 * 60 * 60);
  
  console.log(`Token duration: ${durationInDays} days (~${durationInDays / 365} years)`);
  
  if (Math.abs(durationInDays - 1825) < 1) {
    console.log('SUCCESS: Token expiration is set to approximately 5 years.');
  } else {
    console.log('FAILURE: Token expiration is NOT set to 5 years.');
    process.exit(1);
  }
};

testTokenExp();
