# Smart Inbox Guard

Spam Mail Detection system with Neural Intelligence. This project features a high-accuracy ML classification engine, a secure Node.js backend, and a forensic-grade React dashboard.

## 🛡️ 6-Layer Security Gateway

The system implements a rigorous 6-layer architecture to ensure 100% data integrity and forensic consistency:

1. **Ingestion Layer**: Sanitizes and normalizes email vectors.
2. **ML Inference Layer**: Ensemble model (Transformer + XGBoost + Rule Engine).
3. **Consistency Validation Layer**: Enforces 12 Iron Rules to prevent contradictory results.
4. **Enrichment Layer**: Generates forensic signals and threat dimensions.
5. **Proxy Layer**: Resilient Node.js backend with forensic-grade Degraded Mode.
6. **UI Rendering Layer**: Minimalist React dashboard with strict visual integrity rules.

## Technology Stack

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Express.js (Node.js) + Sequelize ORM
- **ML Microservice**: Python + FastAPI + XGBoost + Scikit-Learn
- **Database**: PostgreSQL (hosted on Neon)

## Standardized Development Ports

| Service | Fixed Port | Description |
| :--- | :--- | :--- |
| **Frontend (UI)** | **8001** | User Interface |
| **Backend (API)** | **3003** | Core logic & Auth |
| **ML Service** | **8000** | Neural classification engine |

## Startup Instructions

### 1. ML Microservice (Python)
```bash
cd ml_service
pip install -r requirements.txt
python -m uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Backend (Node.js)
```bash
cd backend
npm install
npm run dev
```

### 3. Frontend (React)
```bash
cd forntend
npm install
npm run dev
```

## 🚨 Iron UI Rules
- **Classification Alignment**: Progress bar color strictly matches the verdict (SAFE=Green, SUSPICIOUS=Amber, spam=Red).
- **Neural Score Fill**: Bar fill level exactly matches the `neuralSafetyScore` percentage.
- **No Rainbow Bars**: Every filled segment must use the same single color derived from the label.
- **Minimalist Design**: Displays only the percentage verdict and visual evidence artifacts.

## Security & Compliance
- **Input Sanitization**: Multi-stage HTML stripping and unicode normalization.
- **Rate Limiting**: 100 requests per 15 minutes per IP.
- **Fail-Safe Proxy**: Backend automatically switches to a compliant degraded mode if the ML service is unreachable.
- **Fetch Resilience**: Frontend implements `fetchWithRetry` with exponential backoff and 15s timeouts.
