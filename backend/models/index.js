const sequelize = require('../config/database');
const User = require('./User');
const ScamIncident = require('./ScamIncident');
const FeedbackLog = require('./FeedbackLog');
const AuditLog = require('./AuditLog');

// Define Associations
User.hasMany(ScamIncident, { foreignKey: 'userId', onDelete: 'CASCADE' });
ScamIncident.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(FeedbackLog, { foreignKey: 'userId', onDelete: 'CASCADE' });
FeedbackLog.belongsTo(User, { foreignKey: 'userId' });

ScamIncident.hasMany(FeedbackLog, { foreignKey: 'incidentId', onDelete: 'SET NULL' });
FeedbackLog.belongsTo(ScamIncident, { foreignKey: 'incidentId' });

User.hasMany(AuditLog, { foreignKey: 'userId', onDelete: 'SET NULL' });
AuditLog.belongsTo(User, { foreignKey: 'userId' });

module.exports = {
  sequelize,
  User,
  ScamIncident,
  FeedbackLog,
  AuditLog
};
