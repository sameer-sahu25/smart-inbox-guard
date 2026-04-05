require('dotenv').config();
const { spamIncident } = require('../models');
const { Op } = require('sequelize');

async function migrateInconsistentRecords() {
  console.log('Starting migration for inconsistent safety classification records...');
  
  try {
    // Find all records where classification is 'safe' but triggered rules indicate 'suspicious'
    // or risk phrases/signals are high enough to warrant 'suspicious' status (Grade D equivalent)
    const inconsistentRecords = await spamIncident.findAll({
      where: {
        classification: 'safe',
        [Op.or]: [
          { triggeredRules: { [Op.contains]: ['RULE_EXCESSIVE_URLS'] } },
          { triggeredRules: { [Op.contains]: ['RULE_URGENCY_OVERLOAD'] } },
          { triggeredRules: { [Op.contains]: ['RULE_SUSPICIOUS_PHRASES'] } },
          { confidence: { [Op.lt]: 0.75 } } // Neural safety score below threshold for absolute safety
        ]
      }
    });

    console.log(`Found ${inconsistentRecords.length} inconsistent records.`);

    let updatedCount = 0;
    for (const record of inconsistentRecords) {
      // Update classification to suspicious and riskLevel to high (unsafe)
      record.classification = 'suspicious';
      record.riskLevel = 'high';
      await record.save();
      updatedCount++;
      
      if (updatedCount % 10 === 0) {
        console.log(`Updated ${updatedCount} records...`);
      }
    }

    console.log(`Migration complete. Successfully updated ${updatedCount} records.`);
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

// Run if called directly
if (require.main === module) {
  migrateInconsistentRecords().then(() => process.exit(0));
}

module.exports = migrateInconsistentRecords;
