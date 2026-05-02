const axios = require('axios');
require('dotenv').config();

class MLService {
  constructor() {
    this.apiUrl = process.env.ML_SERVICE_URL || 'http://localhost:8000';
    this.client = axios.create({
      baseURL: this.apiUrl,
      timeout: 25000 // Increased from 10s to 25s for complex inference
    });
  }

  async classify(subject, body, sender, userId = null) {
    // Fix 3: Every classify request first checks if ML service is reachable with 3s timeout
    try {
      await axios.get(`${this.apiUrl}/health`, { timeout: 3000 });
    } catch (healthError) {
      console.error(`[ML Service Critical] SERVICE OFFLINE: ML core unreachable during health check: ${healthError.message}`);
      return this._getOfflineResponse();
    }

    try {
      const response = await this.client.post('/classify', {
        subject,
        body,
        sender,
        user_id: userId
      });
      
      // If service returned successfully but reported itself as degraded
      if (response.data.status === 'degraded') {
        console.warn(`[ML Service Warning] Service is running in degraded mode: ${response.data.details?.join(', ')}`);
      }
      
      return response.data;
    } catch (error) {
      const isConnectionError = error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.message.includes('timeout');
      
      console.error(`[ML Service Critical] ${isConnectionError ? 'SERVICE OFFLINE' : 'REQUEST FAILED'}: ${error.message}`);
      
      // Return explicit OFFLINE error
      return this._getOfflineResponse();
    }
  }

  async getForecast(history) {
    try {
      const response = await this.client.post('/predictive-forecast', history);
      return response.data;
    } catch (error) {
      console.error(`[ML Service] Forecast error: ${error.message}`);
      return { forecast: [], error: error.message };
    }
  }

  _getOfflineResponse() {
    return {
      mlServiceOffline: true,
      error: 'ML_SERVICE_OFFLINE',
      message: 'The neural intelligence engine is currently offline. Please ensure the ML service is running on port 8000.',
      verdict: 'OFFLINE',
      label: 'unknown',
      neuralSafetyScore: 0,
      safetyGrade: 'F',
      gradeLabel: 'SERVICE OFFLINE',
      confidenceLevel: 'LOW',
      confidencePercentage: 0,
      explanation: 'Classification failed because the security core (ML Service) is unreachable.',
      is_uncertain: true,
      safetyAssessment: {
        statusBadge: { label: "OFFLINE", color: "#ff0033", icon: "cloud-off" },
        action: { label: "START SERVICE", description: "uvicorn api.main:app --reload --port 8000", color: "#ff0033", icon: "terminal", urgencyLevel: "IMMEDIATE" },
        userRisk: { level: "UNKNOWN", color: "#aaaaaa", description: "Analysis incomplete", impactAreas: [] },
        dataRisk: { level: "UNKNOWN", color: "#aaaaaa", description: "Analysis incomplete", atRiskDataTypes: [] },
        recommended: { primary: "Start the Python ML service immediately", actionItems: ["cd ml_service", "uvicorn api.main:app --reload --port 8000"], urgencyLabel: "CRITICAL", urgencyColor: "#ff0033" }
      },
      identifiedProblems: [
        { id: 99, title: "System Connection Failure", description: "Express backend cannot establish a handshake with the Python ML analysis core.", severity: "CRITICAL", severityColor: "#ff0033" }
      ],
      totalProblemsCount: 1,
      neuralFlags: [],
      totalFlagsCount: 0,
      senderTrust: null, // Hide panel when offline
      modelInfo: { modelVersion: "OFFLINE", inferenceLatencyMs: 0 }
    };
  }

  async batchClassify(emails) {
    try {
      const response = await this.client.post('/batch-classify', {
        emails: emails.map(e => ({
          subject: e.subject,
          body: e.body,
          sender: e.sender
        }))
      });
      return response.data.results;
    } catch (error) {
      console.error(`[ML Service Error] Batch classification failed: ${error.message}`);
      return emails.map(() => ({
        label: 'unknown',
        confidence: 0,
        error: error.message
      }));
    }
  }

  async checkHealth() {
    try {
      const response = await this.client.get('/health');
      return {
        available: response.data.status === 'healthy' || response.data.status === 'degraded' || response.data.status === 'ok',
        status: response.data.status,
        details: response.data.details || []
      };
    } catch (error) {
      console.error(`[ML Health Check] FAILED: ${error.message}`);
      return { available: false, status: 'offline', error: error.message };
    }
  }

  async getForecast(history) {
    try {
      const response = await this.client.post('/predictive-forecast', history);
      return response.data;
    } catch (error) {
      console.error(`[ML Service] Forecast error: ${error.message}`);
      return { forecast: [], error: error.message };
    }
  }

  async submitFeedback(body, subject, predictedLabel, correctLabel) {
    try {
      await this.client.post('/feedback', {
        body,
        subject,
        predicted_label: predictedLabel,
        correct_label: correctLabel
      });
      return true;
    } catch (error) {
      console.error(`[ML Service Error] Feedback submission failed: ${error.message}`);
      return false;
    }
  }
}

module.exports = new MLService();
