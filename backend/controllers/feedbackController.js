const classificationService = require('../services/classificationService');
const { FeedbackLog, sequelize } = require('../models');
const { success, error } = require('../utils/responseHelper');

exports.submitFeedback = async (req, res, next) => {
  try {
    const { incidentId, correctLabel } = req.body;

    if (!incidentId) {
      return error(res, 'incidentId is required', 400);
    }

    const updatedIncident = await classificationService.correctClassification(
      incidentId,
      correctLabel,
      req.userId
    );

    return success(res, updatedIncident, 'Feedback submitted successfully', 201);
  } catch (err) {
    if (err.message.includes('not found or unauthorized')) {
      return error(res, err.message, 404);
    }
    next(err);
  }
};

exports.getFeedbackStats = async (req, res, next) => {
  try {
    const stats = await FeedbackLog.findAll({
      where: { userId: req.userId },
      attributes: [
        'correctLabel',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['correctLabel']
    });

    const totalCount = await FeedbackLog.count({ where: { userId: req.userId } });

    const formattedStats = {
      total: totalCount,
      breakdown: {}
    };

    stats.forEach(s => {
      formattedStats.breakdown[s.correctLabel] = parseInt(s.get('count'));
    });

    return success(res, formattedStats);
  } catch (err) {
    next(err);
  }
};
