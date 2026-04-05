const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class SpamLetterIncident extends Model {}

SpamLetterIncident.init({
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
  subject: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  body: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  sender: {
    type: DataTypes.STRING,
    allowNull: true
  },
  classification: {
    type: DataTypes.ENUM('safe', 'suspicious', 'spam letter'),
    allowNull: false
  },
  confidence: {
    type: DataTypes.FLOAT,
    allowNull: false,
    validate: {
      min: 0,
      max: 1
    }
  },
  calibratedConfidence: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  riskLevel: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'unknown'),
    defaultValue: 'unknown'
  },
  isUncertain: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  uncertaintyLevel: {
    type: DataTypes.STRING,
    allowNull: true
  },
  probabilities: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  topFeatures: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  flaggedTokens: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  riskPhrases: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  triggeredRules: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  ensembleUsed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  ruleOverride: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  reasoningRationale: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  recommendation: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  spamIndicators: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  suspiciousFactors: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  processingTimeMs: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  mlServiceVersion: {
    type: DataTypes.STRING,
    allowNull: true
  },
  requestId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  ipAddress: {
    type: DataTypes.STRING,
    allowNull: true
  },
  userAgent: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  wordCount: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  charCount: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  userCorrectedLabel: {
    type: DataTypes.ENUM('safe', 'suspicious', 'scam'),
    allowNull: true
  },
  userFeedbackAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  feedbackNote: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  sequelize,
  modelName: 'SpamLetterIncident',
  tableName: 'SpamLetterIncidents'
});

module.exports = SpamLetterIncident;
