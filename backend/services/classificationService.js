const mlService = require('./mlService');
const { ScamIncident, AuditLog, FeedbackLog } = require('../models');
const { sanitizeEmailInput } = require('../utils/sanitizer');

class ClassificationService {
  async classifyEmail(emailData, user, req) {
    const startTime = Date.now();
    const sanitized = sanitizeEmailInput(emailData.subject, emailData.body, emailData.sender);
    
    // Call ML Service
    const mlResult = await mlService.classify(sanitized.subject, sanitized.body, sanitized.sender, user ? user.id : null);
    const processingTimeMs = Date.now() - startTime;

    // Map ML risk level to database ENUM
    const riskLevelMap = {
      'High — interacting with this email may result in financial loss or identity theft': 'high',
      'Moderate — potential for phishing or data collection': 'medium',
      'Low — appears to be a standard communication': 'low'
    };
    const riskLevel = riskLevelMap[mlResult.risk_level] || 'unknown';

    // Rule (3): safety assignment must be saved as "unsafe" in the database if suspicious
    let finalClassification = mlResult.verdict ? mlResult.verdict.toLowerCase() : 'unknown';
    if (finalClassification === 'unknown' || finalClassification === 'offline') finalClassification = 'suspicious';
    if (finalClassification === 'spam') finalClassification = 'spam letter';
    
    let incidentId = null;

    // Save to database only if user is logged in
    if (user) {
      const incident = await ScamIncident.create({
        userId: user.id,
        subject: sanitized.subject,
        body: sanitized.body,
        sender: sanitized.sender,
        classification: finalClassification,
        confidence: mlResult.confidencePercentage / 100 || 0,
        calibratedConfidence: mlResult.calibrated_confidence || mlResult.confidencePercentage / 100 || 0,
        riskLevel: mlResult.risk_level === 'CRITICAL' ? 'high' : riskLevel, 
        isUncertain: mlResult.confidenceLevel === 'UNCERTAIN' || false,
        uncertaintyLevel: mlResult.uncertainty_level || null,
        probabilities: mlResult.probabilities || null,
        topFeatures: mlResult.top_features || null,
        flaggedTokens: mlResult.flagged_tokens || null,
        riskPhrases: mlResult.risk_phrases || null,
        triggeredRules: mlResult.triggered_rules || null,
        ensembleUsed: mlResult.modelInfo?.ensembleMethod ? true : false,
        ruleOverride: mlResult.rule_override || false,
        reasoningRationale: mlResult.reasoning_rationale || mlResult.explanation || null,
        recommendation: mlResult.safetyAssessment?.recommended?.primary || mlResult.recommendation || null,
        spamIndicators: mlResult.spam_indicators || null,
        suspiciousFactors: mlResult.suspicious_factors || null,
        processingTimeMs,
        mlServiceVersion: mlResult.modelInfo?.modelVersion || 'v4.2.0-PRO',
        requestId: mlResult.analysisId || null,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        wordCount: sanitized.body.split(/\s+/).length,
        charCount: sanitized.body.length
      });
      incidentId = incident.id;

      // Log action
      await AuditLog.create({
        userId: user.id,
        action: 'ANALYZE',
        resource: 'ScamIncident',
        resourceId: incident.id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        status: 'success'
      });
    }

    return {
      ...mlResult,
      incidentId,
      processingTimeMs
    };
  }

  async batchClassifyEmails(emails, user, req) {
    if (!Array.isArray(emails) || emails.length > 50) {
      throw new Error('Batch size must be between 1 and 50');
    }

    const sanitizedEmails = emails.map(e => sanitizeEmailInput(e.subject, e.body, e.sender));
    const mlResults = await mlService.batchClassify(sanitizedEmails);

    const riskLevelMap = {
      'High — interacting with this email may result in financial loss or identity theft': 'high',
      'Moderate — potential for phishing or data collection': 'medium',
      'Low — appears to be a standard communication': 'low'
    };

    const incidentsData = mlResults.map((res, index) => {
      const label = (res.verdict || res.label || 'unknown').toLowerCase();
      let finalLabel = label;
      if (finalLabel === 'unknown' || finalLabel === 'offline') finalLabel = 'suspicious';
      if (finalLabel === 'spam') finalLabel = 'spam letter';

      return {
        userId: user.id,
        subject: sanitizedEmails[index].subject,
        body: sanitizedEmails[index].body,
        sender: sanitizedEmails[index].sender,
        classification: finalLabel,
        confidence: res.confidencePercentage / 100 || res.confidence || 0,
        riskLevel: riskLevelMap[res.risk_level] || 'unknown',
        isUncertain: res.confidenceLevel === 'UNCERTAIN' || res.is_uncertain || false,
        probabilities: res.probabilities || null,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      };
    });

    const incidents = await ScamIncident.bulkCreate(incidentsData);

    await AuditLog.create({
      userId: user.id,
      action: 'BATCH_ANALYZE',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      status: 'success',
      details: { count: emails.length }
    });

    return mlResults.map((res, i) => ({
      ...res,
      incidentId: incidents[i].id
    }));
  }

  async correctClassification(incidentId, correctLabel, userId) {
    const incident = await ScamIncident.findOne({ where: { id: incidentId, userId } });
    
    if (!incident) {
      throw new Error('Incident not found or unauthorized');
    }

    const predictedLabel = incident.classification;
    
    incident.userCorrectedLabel = correctLabel;
    incident.userFeedbackAt = new Date();
    await incident.save();

    await FeedbackLog.create({
      userId,
      incidentId,
      originalText: incident.body,
      emailSubject: incident.subject,
      predictedLabel,
      correctLabel,
      confidence: incident.confidence
    });

    // Send to ML service
    await mlService.submitFeedback(incident.body, incident.subject, predictedLabel, correctLabel);

    // Create AuditLog entry for feedback submission
    await AuditLog.create({
      userId,
      action: 'FEEDBACK_SUBMIT',
      resource: 'ScamIncident',
      resourceId: incidentId,
      status: 'success',
      details: {
        originalLabel: predictedLabel,
        correctedLabel: correctLabel
      }
    });

    return incident;
  }
}

module.exports = new ClassificationService();
