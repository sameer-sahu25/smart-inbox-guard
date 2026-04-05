const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class FeedbackLog extends Model {}

FeedbackLog.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  incidentId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'ScamIncidents',
      key: 'id'
    }
  },
  originalText: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  emailSubject: {
    type: DataTypes.STRING,
    allowNull: true
  },
  predictedLabel: {
    type: DataTypes.ENUM('safe', 'suspicious', 'spam'),
    allowNull: false
  },
  correctLabel: {
    type: DataTypes.ENUM('safe', 'suspicious', 'spam'),
    allowNull: false
  },
  correctionReason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  confidence: {
    type: DataTypes.FLOAT,
    allowNull: true
  }
}, {
  sequelize,
  modelName: 'FeedbackLog'
});

module.exports = FeedbackLog;
