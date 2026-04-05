const { ScamIncident, AuditLog } = require('../models');
const { Op } = require('sequelize');
const { success, error, paginated } = require('../utils/responseHelper');

exports.getHistory = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;

    const where = { userId: req.userId };

    if (req.query.classification) {
      where.classification = req.query.classification;
    }

    if (req.query.dateFrom || req.query.dateTo) {
      where.createdAt = {};
      if (req.query.dateFrom) where.createdAt[Op.gte] = new Date(req.query.dateFrom);
      if (req.query.dateTo) where.createdAt[Op.lte] = new Date(req.query.dateTo);
    }

    if (req.query.search) {
      where.subject = {
        [Op.iLike]: `%${req.query.search}%`
      };
    }

    const { count, rows } = await ScamIncident.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit,
      offset,
      attributes: { exclude: ['probabilities', 'topFeatures', 'flaggedTokens', 'riskPhrases'] } // Exclude heavy fields for list view
    });

    return paginated(res, rows, {
      page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit)
    });
  } catch (err) {
    next(err);
  }
};

exports.getIncident = async (req, res, next) => {
  try {
    const incident = await ScamIncident.findOne({
      where: { id: req.params.id, userId: req.userId }
    });

    if (!incident) {
      return error(res, 'Incident not found or unauthorized', 404);
    }

    return success(res, incident);
  } catch (err) {
    next(err);
  }
};

exports.deleteIncident = async (req, res, next) => {
  try {
    const deleted = await ScamIncident.destroy({
      where: { id: req.params.id, userId: req.userId }
    });

    if (!deleted) {
      return error(res, 'Incident not found or unauthorized', 404);
    }

    await AuditLog.create({
      userId: req.userId,
      action: 'DELETE',
      resource: 'ScamIncident',
      resourceId: req.params.id,
      status: 'success'
    });

    return success(res, null, 'Incident deleted successfully');
  } catch (err) {
    next(err);
  }
};
