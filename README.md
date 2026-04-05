# 🛡️ Smart Inbox Guard

Smart Inbox Guard is an advanced, AI-powered email security system designed to protect users from spam, phishing, and suspicious communication. It combines a modern React frontend, a robust Node.js backend, and a high-performance Python-based Machine Learning service.

## 🚀 Project Overview

The system operates in three main layers:
1.  **Frontend**: A sleek, high-performance dashboard built with React, Vite, and Tailwind CSS.
2.  **Backend**: A secure Node.js/Express API that manages users, authentication, and orchestrates the ML analysis.
3.  **ML Service**: A specialized Python service running an ensemble of neural networks and heuristic models to classify emails with high accuracy.

## 🏗️ Architecture

-   **Frontend**: React, Vite, Framer Motion, Tailwind CSS, Lucide Icons.
-   **Backend**: Node.js, Express, Sequelize ORM, PostgreSQL (Neon), JWT.
-   **ML Service**: Python, FastAPI, Scikit-learn, Joblib.

## 📁 Project Structure

```text
smart-inbox-guard/
├── forntend/          # React Dashboard (Vite)
├── backend/           # Node.js API Service
└── ml_service/        # Python ML Classification Engine
```

## 🛠️ Setup & Installation

### Prerequisites
- Node.js (v20+)
- Python (v3.9+)
- PostgreSQL Database (Neon DB recommended)

### 1. Backend Setup
```bash
cd backend
npm install
# Configure your .env file with DATABASE_URL, JWT_SECRET, etc.
npm start
```

### 2. ML Service Setup
```bash
cd ml_service
pip install -r requirements.txt
uvicorn api.main:app --reload --port 8000
```

### 3. Frontend Setup
```bash
cd forntend
npm install
npm run dev
```

## 🌐 Deployment

-   **Frontend**: Optimized for **Netlify**.
-   **Backend**: Configured for **Render** with PostgreSQL.
-   **ML Service**: Deployed as a standalone service on **Render**.

## 🔐 Security Features
-   **Extended JWT**: Tokens valid for 5 years for persistent user sessions.
-   **Neural Guard**: Multi-stage analysis to detect sophisticated phishing attempts.
-   **Audit Logs**: Full tracking of security-sensitive actions.
-   **Rate Limiting**: Protection against brute-force and DDoS attacks.

## 📄 License
This project is licensed under the MIT License.
