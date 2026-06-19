# FinGuard AI Service — Implementation Walkthrough

## What was built

Complete ML/AI pipeline for the FinGuard fraud detection system, from raw data → trained model → FastAPI serving.

---

## Architecture

```
ai-service/app/
├── config.py                          # Environment config
├── schemas.py                         # Pydantic request/response models
├── main.py                            # FastAPI app (4 endpoints)
├── data/
│   ├── clean_dataset.py               # Raw CSV → cleaned 15-column table
│   └── cleaned_transactions.csv       # 70,005 rows (generated)
├── features/
│   ├── feature_engineering.py         # 19 candidate features (8 groups)
│   └── feature_selection.py           # MI ranking + RFECV
├── training/
│   ├── train.py                       # 6-model comparison, GPU XGBoost
│   └── retrain.py                     # Feedback-triggered retraining
├── graph/
│   ├── graph_builder.py               # NetworkX DiGraph from transfers
│   ├── graph_detection.py             # Fan, ring, cycle detection
│   └── graph_store.py                 # In-memory graph lifecycle
├── db/
│   └── mongo.py                       # Read-only Motor async MongoDB
├── explainability/
│   └── shap_explainer.py              # Auto-select Tree/Linear/Kernel
└── models/
    ├── fraud_model.pkl                # Best model (XGBoost, 722KB)
    ├── fraud_model_merchant_rates.pkl # Leakage-safe merchant rates
    └── model_metadata.json            # Full training provenance
```

---

## Data Pipeline

| Stage | Input | Output |
|-------|-------|--------|
| Raw dataset | `hackathon_ai_dataset.csv` (70,035 rows, 41 columns) | — |
| Cleaning | Drop junk columns, normalize Amount→amt, parse dates | 70,005 rows, 15 columns |
| Feature engineering | 8 feature groups | 19 candidate features |
| Feature selection | RFECV (5-fold CV, average_precision) | **10 selected features** |
| SMOTE | 545 fraud → 55,459 fraud (balanced) | 110,918 training rows |

### Selected Features (10)
`log_amount`, `hour`, `txn_sum_5min`, `txn_sum_1h`, `txn_sum_24h`, `time_since_last_txn_min`, `amt_zscore_personal`, `amt_to_avg_ratio`, `category_risk_score`, `merchant_fraud_rate`

### Dropped Features (9)
`geo_distance_km` (MI=0), `day_of_week`, `is_night`, `is_weekend`, `txn_count_5min`, `txn_count_1h`, `txn_count_24h`, `is_new_merchant_for_card`, `benford_deviation`

---

## Model Training Results

| Model | PR-AUC | Precision | Recall | F1 | Time |
|-------|--------|-----------|--------|----|------|
| **XGBoost (GPU) 👑** | **0.7966** | **0.851** | **0.632** | **0.726** | **1.5s** |
| Stacking (RF+XGB→LR) | 0.7336 | 0.833 | 0.625 | 0.714 | 63.1s |
| Random Forest | 0.6908 | 0.748 | 0.610 | 0.672 | 8.1s |
| SVM | 0.6506 | 0.414 | 0.779 | 0.541 | 292.9s |
| Logistic Regression | 0.6216 | 0.203 | 0.919 | 0.332 | 6.1s |
| Decision Tree | 0.4162 | 0.327 | 0.618 | 0.427 | 1.0s |

**GPU acceleration**: XGBoost trained on NVIDIA RTX 3050 (`device='cuda'`, `tree_method='hist'`). Fastest and best model at 1.5s.

Total pipeline time: **9.5 minutes** (feature engineering: 46s, SVM dominated at 293s).

---

## Testing

**16/16 tests passing** across:
- `test_feature_engineering.py` — 9 tests (geo distance, time features, log amount, category risk)
- `test_graph_detection.py` — 7 tests (fan patterns, cycles, centrality, unknown accounts)

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Model status, version, graph stats |
| POST | `/analyze_transaction` | Fraud score (Gate 1) + smurfing check (Gate 2) |
| POST | `/detect_smurfing` | Deep graph-only scan for an account |
| POST | `/explain_prediction` | SHAP top-5 contributing factors |
| GET | `/model/comparison` | Training comparison results |

---

## Key Design Decisions

1. **Leakage-safe merchant fraud rate**: Fitted on train fold only, applied to test — prevents label leakage
2. **RFECV over manual feature selection**: Data-driven pruning (19→10 features) with cross-validated performance
3. **PR-AUC over accuracy**: At ~1% fraud rate, accuracy is meaningless — PR-AUC properly evaluates imbalanced classification
4. **GPU for XGBoost only**: Other sklearn models don't natively support CUDA; XGBoost was both the best candidate and the biggest GPU beneficiary
5. **GraphStore singleton with MongoDB resync**: In-memory graph for speed, periodic MongoDB rebuild as drift safety net
