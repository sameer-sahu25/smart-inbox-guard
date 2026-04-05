const { ScamIncident, sequelize } = require('../models');
const { Op, Sequelize } = require('sequelize');
const mlService = require('./mlService');

const getUserStats = async (userId) => {
  try {
    // Total counts by classification
    const stats = await ScamIncident.findAll({
      where: { userId },
      attributes: [
        'classification',
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
      ],
      group: ['classification']
    });

    const counts = {
      safe: 0,
      suspicious: 0,
      spam: 0,
      total: 0
    };

    stats.forEach(s => {
      const label = (s.get('classification') || '').toLowerCase();
      const count = parseInt(s.get('count'), 10) || 0;
      
      if (label === 'safe') counts.safe = count;
      else if (label === 'suspicious') counts.suspicious = count;
      else if (['scam', 'spam letter', 'spam', 'spam_letter', 'scam_detected'].includes(label)) counts.spam += count;
      
      counts.total += count;
    });

    // 7-day change (last 7 days vs previous 7 days)
    const last7DaysTotal = await ScamIncident.count({
      where: {
        userId,
        createdAt: { [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      }
    });

    const previous7DaysTotal = await ScamIncident.count({
      where: {
        userId,
        createdAt: {
          [Op.between]: [
            new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
            new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          ]
        }
      }
    });

    // Detailed changes for each category
    const getCountInRange = async (label, startDays, endDays) => {
      const where = {
        userId,
        createdAt: {
          [Op.between]: [
            new Date(Date.now() - startDays * 24 * 60 * 60 * 1000),
            new Date(Date.now() - endDays * 24 * 60 * 60 * 1000)
          ]
        }
      };
      
      if (label === 'spam') {
        where.classification = { [Op.in]: ['spam letter', 'spam', 'scam'] };
      } else if (label) {
        where.classification = label;
      }
      
      return await ScamIncident.count({ where });
    };

    const calcChange = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return parseFloat(((current - previous) / previous * 100).toFixed(1));
    };

    const categories = ['safe', 'suspicious', 'spam', null];
    const changes = {};

    for (const cat of categories) {
      const current = await getCountInRange(cat, 7, 0);
      const previous = await getCountInRange(cat, 14, 7);
      const key = cat || 'total';
      changes[key] = {
        val: calcChange(current, previous),
        isIncrease: current >= previous
      };
    }

    return {
      stats: {
        total_analyzed: counts.total,
        scam_detected: counts.spam,
        suspicious_incidents: counts.suspicious,
        phishing_alerts: counts.suspicious, // Keep for legacy compatibility
        safe_emails: counts.safe
      },
      changes: {
        total_change: Math.abs(changes.total.val),
        scam_change: Math.abs(changes.spam.val),
        phishing_change: Math.abs(changes.suspicious.val),
        safe_change: Math.abs(changes.safe.val),
        is_increase: {
          total: changes.total.isIncrease,
          spam: changes.spam.isIncrease,
          phishing: changes.suspicious.isIncrease,
          safe: changes.safe.isIncrease
        }
      }
    };
  } catch (err) {
    console.error(`[StatsService] Error fetching user stats for user: ${userId}`, err);
    throw err;
  }
};

const getTrendData = async (userId, days = 14) => {
  try {
    const trend = await ScamIncident.findAll({
      where: {
        userId,
        createdAt: { [Op.gte]: new Date(Date.now() - days * 24 * 60 * 60 * 1000) }
      },
      attributes: [
        [Sequelize.fn('DATE', Sequelize.col('createdAt')), 'date'],
        'classification',
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
      ],
      group: [Sequelize.fn('DATE', Sequelize.col('createdAt')), 'classification'],
      order: [[Sequelize.fn('DATE', Sequelize.col('createdAt')), 'ASC']]
    });

    // Format for frontend (array of objects with date and counts)
    const formattedData = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dateStr = d.toISOString().split('T')[0];
      formattedData[dateStr] = { date: dateStr, safe: 0, suspicious: 0, spam: 0, total: 0 };
    }

    trend.forEach(t => {
      let rawDate = t.get('date');
      let date;
      
      if (rawDate instanceof Date) {
        date = rawDate.toISOString().split('T')[0];
      } else if (typeof rawDate === 'string') {
        date = rawDate.split(' ')[0].split('T')[0];
      }

      if (date && formattedData[date]) {
        const label = (t.get('classification') || '').toLowerCase();
        const count = parseInt(t.get('count'), 10) || 0;
        
        if (label === 'safe') {
          formattedData[date].safe += count;
        } else if (label === 'suspicious') {
          formattedData[date].suspicious += count;
        } else if (['scam', 'spam letter', 'spam', 'spam_letter', 'scam_detected'].includes(label)) {
          formattedData[date].spam += count;
        }
        
        formattedData[date].total += count;
      }
    });

    return Object.values(formattedData);
  } catch (err) {
    console.error(`[StatsService] Error fetching trend data for user: ${userId}`, err);
    throw err;
  }
};

const getSummary = async (userId) => {
  try {
    const { stats, changes } = await getUserStats(userId);
    const trend = await getTrendData(userId, 7);
    
    // Predictive Modeling (Fix: Feature Set)
    let forecast = [];
    try {
      const forecastResult = await mlService.getForecast(trend);
      forecast = forecastResult.forecast || [];
    } catch (err) {
      console.warn(`[StatsService] Forecast failed: ${err.message}`);
    }
    
    // Get recent activity
    const recentIncidents = await ScamIncident.findAll({
      where: { userId },
      limit: 5,
      order: [['createdAt', 'DESC']]
    });

    return {
      stats,
      changes,
      trend,
      forecast,
      recentIncidents,
      last_updated: new Date().toISOString()
    };
  } catch (err) {
    console.error(`[StatsService] Error generating summary for user: ${userId}`, err);
    throw err;
  }
};

module.exports = {
  getUserStats,
  getTrendData,
  getSummary
};
