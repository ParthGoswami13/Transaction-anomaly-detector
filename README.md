# 🛡️ FinGuard — AI-Powered Transaction Fraud & Smurfing Detection System

> Real-time financial crime detection combining **ML-based fraud scoring**, **graph-based smurfing detection**, and **AI-powered KYC verification**.

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
finguard/
├── frontend/              # React + Vite + Tailwind
│   └── src/
│       ├── pages/         # Dashboard, Transactions, Cases, Graph, KYC
│       ├── components/    # Sidebar, StatsCard, RiskBadge, FraudGraphView...
│       └── api/           # Axios client with JWT interceptor
├── backend/               # Express + MongoDB
│   └── src/
│       ├── models/        # User, Transaction, KycRecord
│       ├── routes/        # auth, transactions, cases, kyc
│       ├── middleware/    # JWT auth
│       └── services/      # KYC OCR proxy (Groq)
├── ai-service/            # FastAPI
│   └── app/
│       ├── main.py        # API endpoints
│       ├── feature_engineering.py
│       ├── train.py       # Ensemble training (run manually)
│       ├── graph_detection.py
│       ├── explainability.py
│       └── models/        # .pkl + metadata.json
└── docker-compose.yml
```

---

## 🔮 Future Enhancements

- Unsupervised behavioral clustering (KMeans / DBSCAN)
- Neo4j graph database for scalable smurfing detection
- Scheduled retraining triggered by analyst feedback volume
- CI/CD with GitHub Actions
- Cloud deployment (AWS/GCP) with model artifacts in object storage
