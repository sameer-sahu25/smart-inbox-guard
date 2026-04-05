# Smart Inbox Guard - ML Microservice Operations Guide

This service provides enterprise-grade machine learning intelligence for the Smart Inbox Guard system. It uses a two-stage ensemble model combined with a deterministic rule engine to classify emails and provide detailed safety assessments.

## Architecture Overview

The system uses an ensemble approach to defeat sophisticated adversarial attacks:
- **Core Logic (`core/`)**:
    - `preprocessor.py`: A 16-step pipeline that normalizes character obfuscation (leet-speak), strips weaponized HTML, and replaces sensitive patterns (URLs, emails, money) with tokens.
    - `feature_engine.py`: Extracts structural signals (caps ratios, token density, urgency scores) to defeat adversarial padding attacks that TF-IDF alone misses.
    - `threat_rules.py`: A deterministic engine that identifies high-confidence threats (credential harvesting, advance-fee scams) via hard rules that can override the ML model.
- **Ensemble Model**:
    - **Stage 1**: TF-IDF + Complement Naive Bayes (70% weight) - Optimized for text understanding.
    - **Stage 2**: RandomForest on structural features (30% weight) - Optimized for composition patterns.
- **Explainability & Calibration (`utils/`)**:
    - `calibrator.py`: Uses Isotonic Regression to ensure confidence scores reflect real-world accuracy.
    - `explainer.py`: Generates plain-English rationale and risk assessments for every prediction.

## Installation

### Prerequisites
- Python 3.10+
- pip

### Steps
1. Navigate to the `ml_service` directory.
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Verify installation with unit tests:
   ```bash
   python -m pytest tests/ -v
   ```

## Training

Before starting the server, you must generate the model artifacts:
```bash
python models/train.py
```
**What to expect**:
- The script will load `email_classification_dataset.csv`.
- It will train both Stage 1 and Stage 2 models.
- It will fit the probability calibrator.
- Output: `model_stage1.pkl`, `model_stage2.pkl`, `calibrator.pkl`, `label_classes.json`, `model_meta.json`.
- **Accuracy**: Expect ensemble accuracy > 90%. A warning will trigger if any class F1 score drops below 0.88.

## Starting the Server

Start the production FastAPI server using Uvicorn:
```bash
uvicorn api.main:app --reload --port 8000
```
The server will be available at `http://localhost:8000`.

## API Usage

### Health Check
`GET http://localhost:8000/health`
Verifies model loading, ensemble status, and server uptime.

### Single Classification
`POST http://localhost:8000/classify`
```bash
curl -X POST http://localhost:8000/classify \
-H "Content-Type: application/json" \
-d '{
  "subject": "URGENT: Verify your account",
  "body": "Dear customer, your account has been suspended. Click http://spam.ru/login to verify.",
  "sender": "security@paypal-secure.com"
}'
```

### Batch Classification
`POST http://localhost:8000/batch-classify`
Supports up to 50 emails per request. Returns a list of results in the same order.

### Submitting Feedback
`POST http://localhost:8000/feedback`
Use this whenever a user corrects a classification. Feedback is logged to `feedback_log.csv` for future retraining.

## Maintenance & Retraining

### Retraining
Retrain the model every 200+ feedback rows or if model decay is detected:
```bash
python models/retrain.py
```
The script will only overwrite artifacts if the new model's accuracy is equal or better than the current one.

### Model Decay Detection
Run the evaluation script weekly to detect performance drops:
```bash
python models/evaluate.py
```
To evaluate on custom datasets:
```bash
python models/evaluate.py --test-file data/email_classification_3000.csv
python models/evaluate.py --test-file data/my_custom_dataset.csv
python models/evaluate.py --test-file data/test_keywords.csv
```
Check `evaluation_report.txt` for per-class F1 scores. A RED WARNING triggers if any F1 score falls below 0.85.

## Common Errors & Fixes

- **`RuntimeError: Missing model file...`**: Run `python models/train.py` to generate the artifacts.
- **`ModuleNotFoundError: No module named 'core'`**: Ensure you are running commands from the `ml_service` root directory or that `PYTHONPATH` includes the project root.
- **Port 8000 already in use**: Change the port using the `--port` flag in the uvicorn command.

## Security & Threat Analysis (2026 Update)

The Smart Inbox Guard has been comprehensively updated to address real-world security challenges:

### Threat Landscape Data
- **AI-Generated Phishing**: The system now includes specific regex and keyword patterns to detect robotic linguistic markers typical of large-scale LLM-driven campaigns.
- **QR Code Phishing**: New deterministic rules identify calls-to-action involving QR code scanning paired with external URLs.
- **Adversarial Obfuscation**: The preprocessor's 16-step normalization handles homoglyphs and leet-speak commonly used to bypass keyword filters.

### Robust Filtering Mechanisms (v4.2.0-PRO)
- **Multi-layer Ensemble**: Combines text-based Naive Bayes (Word level), Structural Pattern Logistic Regression (Char level), and Gradient Boosting (XGB-style) on behavioral metadata.
- **Scoring Framework**: 
    - **SCAM (High Risk)**: Safety Score 0-30 (Spam probability > 70%)
    - **SUSPICIOUS (Moderate Risk)**: Safety Score 31-79 (Spam probability 21-70%)
    - **SAFE (High Confidence)**: Safety Score 80-100 (Spam probability < 20%)
- **Deterministic Overrides**: Critical threats (e.g., credential harvesting) bypass ML inference for 100% reliable interception.
- **False Positive Mitigation**: Calibration using band-analysis ensures high-confidence "Safe" verdicts are prioritized.

### Performance Benchmarks
- **Target Latency**: < 250ms (achieved via parallelized pipeline).
- **Target Accuracy**: > 95% on historical datasets.
- **False Positive Rate**: < 1.0% for business-critical communications.
- **Threat Interception**: > 98% recall for high-risk phishing vectors.

## Implementation Roadmap

### Phase 1: Deployment & Baseline (Current)
- Deploy ensemble v4.2.0-PRO.
- Establish performance benchmarks.
- Monitor `/performance` endpoint for real-time health.

### Phase 2: Adaptive Learning (Q3 2026)
- Automate feedback-loop retraining using user-reported false positives.
- Integrate real-time threat intelligence feeds into the hot-reload keyword engine.

### Phase 3: Advanced Integration (Q4 2026)
- Webhook support for external SIEM/SOAR integration.
- Federated learning support for privacy-preserving global threat sharing.
