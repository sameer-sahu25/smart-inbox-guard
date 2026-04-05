module.exports = {
  baseUrl: process.env.ML_SERVICE_URL || 'http://localhost:8000',
  timeout: {
    classify: 10000, // 10 seconds
    batchClassify: 30000, // 30 seconds
    health: 5000 // 5 seconds
  },
  retries: 1
};
