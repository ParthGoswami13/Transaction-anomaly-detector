# 🛡️ FinGuard — AI-Powered Transaction Fraud & Smurfing Detection System

> Real-time financial crime detection combining **ML-based fraud scoring**, **graph-based smurfing detection**, and **AI-powered KYC verification**.

---

## ✨ Key Features

- **🧠 Ensemble Machine Learning**: Compares 6 distinct ML models (XGBoost, Random Forest, SVM, etc.) dynamically via PR-AUC to ensure high precision on highly imbalanced transaction data.
- **🕸️ Graph-Based Smurfing Detection**: Builds a live in-memory NetworkX graph to catch complex money laundering typologies (fan-in, fan-out, layering cycles, and fraud rings).
- **👁️ Explainable AI (SHAP)**: Every blocked transaction includes a human-readable SHAP breakdown explaining exactly *why* the model flagged it.
- **💳 KYC Document Verification**: Integrates with Groq Vision LLMs for lightning-fast OCR and identity verification.
- **✨ Ultra-Premium UI/UX**: Features a stunning, Framer Motion-powered dark mode interface with interactive 3D grid backgrounds, glassmorphism components, and dynamic hover states for a truly next-gen analyst experience.
- **⚡ Hot-Swappable AI Architecture**: Decoupled Python FastAPI service allows data scientists to swap models without touching the Node.js/React stack.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     React Frontend (Vite + Tailwind)            │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  Dashboard   │  │ Fraud Graph  │  │  Case Review Queue   │  │
│  └─────────────┘  └──────────────┘  └──────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTP (JWT Auth)
┌────────────────────────────▼────────────────────────────────────┐
│                  Express + MongoDB Backend                      │
│  ┌──────┐  ┌──────────────┐  ┌──────────┐  ┌──────────────┐  │
│  │ Auth │  │ Transactions │  │  Cases   │  │ KYC (Groq)   │  │
│  └──────┘  └──────┬───────┘  └──────────┘  └──────────────┘  │
└───────────────────┬─────────────────────────────────────────────┘
                    │ HTTP
┌───────────────────▼─────────────────────────────────────────────┐
│                    FastAPI AI Service                            │
│  ┌─────────────────┐  ┌─────────────┐  ┌──────────────────┐   │
│  │ Fraud Scoring   │  │  Smurfing   │  │  SHAP Explain    │   │
│  │ (Ensemble ML)   │  │ (NetworkX)  │  │  (TreeExplainer) │   │
│  └─────────────────┘  └─────────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+
- **Python** 3.11+
- **MongoDB** (local or Atlas)

### 1. Backend
```bash
cd backend
cp .env.example .env   # Edit with your secrets
npm install
npm run dev
```

### 2. AI Service
```bash
cd ai-service
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```

### Docker (all services)
```bash
docker-compose up --build
```

---

## 📡 API Endpoints

| Method | Endpoint | Service | Description |
|--------|----------|---------|-------------|
| POST | `/api/auth/register` | Backend | Register new user |
| POST | `/api/auth/login` | Backend | JWT login |
| GET | `/api/auth/me` | Backend | Current user info |
| POST | `/api/transactions` | Backend | Create + AI-score a transaction |
| GET | `/api/transactions` | Backend | List with pagination/filters |
| GET | `/api/transactions/flagged` | Backend | High-risk transactions |
| GET | `/api/transactions/stats` | Backend | Dashboard statistics |
| PATCH | `/api/cases/:id/label` | Backend | Analyst marks true/false positive |
| GET | `/api/cases/pending` | Backend | Pending review queue |
| POST | `/api/kyc/extract` | Backend | Upload ID → Groq OCR |
| POST | `/analyze_transaction` | AI Service | Fraud score + smurfing check |
| POST | `/explain_prediction` | AI Service | SHAP explanation |
| GET | `/model/comparison` | AI Service | Ensemble comparison results |
| GET | `/health` | AI Service | Service + model status |

---

## 🧠 ML Pipeline

The AI service supports an **ensemble comparison** of 6 models:
1. Logistic Regression
2. Decision Tree
3. SVM (RBF kernel)
4. Random Forest
5. XGBoost
6. Stacking (RF + XGB → LogReg)

Selected by **PR-AUC** (not accuracy) to handle class imbalance.

### Model Performance (Evaluation)
Based on recent training evaluation with 70,000+ transaction records (using SMOTE oversampling and RFECV feature selection):

| Model | PR-AUC | Training Time |
|-------|--------|---------------|
| **XGBoost** 👑 | **0.7966** | 1.5s |
| Stacking | 0.7336 | 63.1s |
| Random Forest | 0.6908 | 8.1s |
| SVM (RBF) | 0.6506 | 292.9s |
| Logistic Regression | 0.6216 | 6.1s |
| Decision Tree | 0.4162 | 1.0s |

### Training (when ready)
```bash
cd ai-service
python -m app.train --data path/to/transactions.csv
```

---

## 🔐 Environment Variables

```bash
# backend/.env
PORT=4000
MONGO_URI=mongodb://localhost:27017/finguard
JWT_SECRET=your_secret_here
AI_SERVICE_URL=http://localhost:8000
GROQ_API_KEY=your_groq_key

# ai-service/.env
MODEL_PATH=app/models/fraud_model.pkl
```

> ⚠️ Never commit `.env` files. Use `.env.example` as template.

---

## 📁 Project Structure

```
FinGuard/
├── frontend/              # React + Vite + Tailwind
│   └── src/
│       ├── pages/         # Dashboard, Admin, Transactions, Cases, FraudGraph, KYC, Login
│       ├── components/    # Background3D, Sidebar, Topbar, StatsCard, DetailPanel
│       │                  # TransactionTable, FraudGraphView, ModelComparisonChart...
│       ├── context/       # ThemeContext (Dark Mode management)
│       └── api/           # Axios client with JWT interceptor
├── backend/               # Express + Node.js + MongoDB
│   ├── seed-fraud.js      # Script to inject mock synthetic fraud data
│   └── src/
│       ├── models/        # User, Transaction, KycRecord
│       ├── routes/        # auth, transactions, cases, kyc
│       ├── middleware/    # JWT auth
│       └── services/      # KYC OCR proxy (Groq)
├── ai-service/            # Python FastAPI
│   ├── task-120.log       # Output log from the ML ensemble training
│   └── app/
│       ├── main.py        # API endpoints (/analyze_transaction, /explain_prediction)
│       ├── features/      # feature_engineering, feature_selection
│       ├── training/      # train.py (Ensemble training & evaluation)
│       ├── graph/         # graph_builder, graph_detection, graph_store
│       ├── explainability/# shap_explainer.py
│       └── models/        # fraud_model.pkl + model_metadata.json
└── docker-compose.yml
```

---

## 🔮 Future Enhancements

- Unsupervised behavioral clustering (KMeans / DBSCAN)
- Neo4j graph database for scalable smurfing detection
- Scheduled retraining triggered by analyst feedback volume
- CI/CD with GitHub Actions
- Cloud deployment (AWS/GCP) with model artifacts in object storage
