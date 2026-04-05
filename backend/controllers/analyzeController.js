const classificationService = require('../services/classificationService');
const { success, error } = require('../utils/responseHelper');

exports.analyze = async (req, res, next) => {
  try {
    const result = await classificationService.classifyEmail(req.body, req.user, req);
    return success(res, result, 'Analysis complete');
  } catch (err) {
    next(err);
  }
};

exports.batchAnalyze = async (req, res, next) => {
  try {
    const { emails } = req.body;
    
    if (!Array.isArray(emails)) {
      return error(res, 'Emails must be an array', 400);
    }

    const results = await classificationService.batchClassifyEmails(emails, req.user, req);
    return success(res, results, 'Batch analysis complete');
  } catch (err) {
    if (err.message.includes('Batch size')) {
      return error(res, err.message, 400);
    }
    next(err);
  }
};
