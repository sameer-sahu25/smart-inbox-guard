const statsService = require('../services/statsService');
const { success } = require('../utils/responseHelper');

exports.getStats = async (req, res, next) => {
  try {
    const stats = await statsService.getUserStats(req.userId);
    return success(res, stats);
  } catch (err) {
    next(err);
  }
};

exports.getTrend = async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 14;
    const trend = await statsService.getTrendData(req.userId, days);
    return success(res, trend);
  } catch (err) {
    next(err);
  }
};

exports.getSummary = async (req, res, next) => {
  try {
    console.log(`[DashboardController] Fetching summary for user: ${req.userId}`);
    const summary = await statsService.getSummary(req.userId);
    console.log(`[DashboardController] Summary fetch successful for user: ${req.userId}`);
    return success(res, summary);
  } catch (err) {
    console.error(`[DashboardController] Error fetching summary for user: ${req.userId}`, err);
    next(err);
  }
};
