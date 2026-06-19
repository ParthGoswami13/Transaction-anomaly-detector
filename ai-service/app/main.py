"""
FinGuard AI Service — FastAPI Main Application.

Serves the trained fraud detection model via REST API.

Endpoints:
  GET  /health               — Model status, version, graph stats
  POST /analyze_transaction   — Fraud score (Gate 1) + smurfing check (Gate 2)
  POST /detect_smurfing       — Deep graph-only scan for an account
  POST /explain_prediction    — SHAP top-5 contributing factors
  GET  /model/comparison      — Training comparison results
"""

import json
import os
import sys
import logging
import asyncio
import joblib
import sklearn
import pandas as pd
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.schemas import TransactionIn, TransferIn, AnalyzeResponse
from app.features.feature_engineering import build_features, transform_merchant_fraud_rate
from app.graph.graph_store import graph_store, scheduled_rebuild_loop
from app.graph.graph_detection import detect_smurfing
from app.explainability.shap_explainer import explain_prediction

# ── Logging ─────────────────────────────────────────────────
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


# ── Model Loading ───────────────────────────────────────────
MODEL = None
METADATA = None
MERCHANT_RATES = None


def _load_model():
    """Load the trained model, metadata, and merchant rates."""
    global MODEL, METADATA, MERCHANT_RATES

    model_path = settings.MODEL_PATH
    meta_path = settings.METADATA_PATH
    rates_path = settings.MERCHANT_RATES_PATH

    if not os.path.exists(model_path):
        logger.warning(f"Model file not found at {model_path} — endpoints will use rule-based scoring")
        return

    if not os.path.exists(meta_path):
        logger.warning(f"Metadata file not found at {meta_path}")
        return

    MODEL = joblib.load(model_path)
    with open(meta_path) as f:
        METADATA = json.load(f)

    # Sklearn version safety check
    trained_version = METADATA.get('sklearn_version', 'unknown')
    runtime_version = sklearn.__version__
    if trained_version != runtime_version:
        logger.warning(
            f"⚠️ sklearn version mismatch: model trained on {trained_version}, "
            f"runtime has {runtime_version}. Consider retraining."
        )

    # Load merchant fraud rates
    if os.path.exists(rates_path):
        MERCHANT_RATES = joblib.load(rates_path)
        logger.info(f"Loaded merchant rates ({len(MERCHANT_RATES.get('rates_dict', {}))} merchants)")
    else:
        MERCHANT_RATES = {'rates_dict': {}, 'global_rate': 0.01}
        logger.warning(f"Merchant rates file not found at {rates_path}, using defaults")

    logger.info(
        f"✅ Model loaded: {METADATA.get('model_name', 'unknown')} "
        f"(trained {METADATA.get('trained_at', 'unknown')}, "
        f"{len(METADATA.get('feature_order', []))} features)"
    )


_load_model()


# ── App Lifecycle ───────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Startup: rebuild graph from MongoDB + start periodic resync.
    Shutdown: cleanup.
    """
    # Startup
    logger.info("Starting AI service...")
    try:
        await graph_store.rebuild_from_db()
    except Exception as e:
        logger.warning(f"Initial graph rebuild failed (MongoDB may not be available): {e}")

    # Start periodic graph rebuild as background task
    rebuild_task = asyncio.create_task(
        scheduled_rebuild_loop(settings.GRAPH_REBUILD_INTERVAL_MINUTES)
    )

    yield

    # Shutdown
    rebuild_task.cancel()
    logger.info("AI service shutting down")


app = FastAPI(
    title="FinGuard AI Service",
    description="AI-powered fraud scoring, smurfing detection, and prediction explainability",
    version="2.0.0",
    lifespan=lifespan,
)

# CORS — allow the React frontend and Express backend to call us
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Endpoints ───────────────────────────────────────────────

@app.get("/health")
def health():
    """Health check with model info and graph stats."""
    return {
        "status": "ok",
        "model_loaded": MODEL is not None,
        "model": METADATA.get('model_name') if METADATA else None,
        "trained_at": METADATA.get('trained_at') if METADATA else None,
        "feature_count": len(METADATA.get('feature_order', [])) if METADATA else 0,
        "graph_nodes": graph_store.graph.number_of_nodes(),
        "graph_edges": graph_store.graph.number_of_edges(),
    }


@app.post("/analyze_transaction", response_model=AnalyzeResponse)
def analyze_transaction(txn: TransactionIn):
    """
    Score a single transaction for fraud probability (Gate 1)
    and check the account-level transaction graph for smurfing (Gate 2).
    """
    proba = 0.0
    flags = []

    if MODEL is not None and METADATA is not None:
        try:
            df = pd.DataFrame([txn.model_dump()])
            df = build_features(df)

            # Apply merchant fraud rate
            if MERCHANT_RATES:
                df = transform_merchant_fraud_rate(
                    df, MERCHANT_RATES['rates_dict'], MERCHANT_RATES['global_rate']
                )

            feature_order = METADATA.get('feature_order', [])
            missing = [c for c in feature_order if c not in df.columns]
            if missing:
                raise HTTPException(
                    status_code=422,
                    detail=f"Cannot compute required features: {missing}"
                )

            X = df[feature_order].astype(float).fillna(0.0)
            proba = float(MODEL.predict_proba(X)[0][1])

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Model prediction failed: {e}")
            # Fall through to rule-based scoring

    # Rule-based flag augmentation
    try:
        df_rules = pd.DataFrame([txn.model_dump()])
        df_rules = build_features(df_rules)

        if 'geo_distance_km' in df_rules.columns and df_rules['geo_distance_km'].iloc[0] > 100:
            flags.append('geolocation_mismatch')
        if 'is_night' in df_rules.columns and df_rules['is_night'].iloc[0]:
            flags.append('odd_hour')
        if txn.amt > 1000:
            flags.append('high_amount')
        if proba > 0.7:
            flags.append('high_risk_score')
    except Exception as e:
        logger.warning(f"Rule-based flags failed: {e}")

    # Smurfing check — reads the graph using cardNum as node key
    smurfing_result = detect_smurfing(graph_store.graph, txn.cardNum)

    return AnalyzeResponse(
        fraud_detection={
            "result": "Fraud" if proba > 0.5 else "Legit",
            "confidence": round(proba, 4),
            "flags": flags,
        },
        smurfing_detection={
            "is_smurfing": smurfing_result["is_smurfing"],
            "pattern": smurfing_result.get("pattern"),
        },
    )


@app.post("/detect_smurfing")
def detect_smurfing_endpoint(transfer: TransferIn):
    """
    Deep graph-only scan for smurfing/structuring patterns.
    Also adds the transfer as a live edge to the in-memory graph.
    """
    graph_store.add_live_transaction(
        transfer.sender_account, transfer.receiver_account, transfer.amount
    )
    return detect_smurfing(graph_store.graph, transfer.sender_account)


@app.post("/explain_prediction")
def explain(txn: TransactionIn):
    """
    Generate SHAP-based explanation for a fraud prediction.
    Returns top-5 contributing features.
    """
    if MODEL is None:
        raise HTTPException(status_code=503, detail="No model loaded")

    df = pd.DataFrame([txn.model_dump()])
    df = build_features(df)

    if MERCHANT_RATES:
        df = transform_merchant_fraud_rate(
            df, MERCHANT_RATES['rates_dict'], MERCHANT_RATES['global_rate']
        )

    feature_order = METADATA.get('feature_order', [])
    for col in feature_order:
        if col not in df.columns:
            df[col] = 0.0

    X = df[feature_order].astype(float).fillna(0.0)
    return explain_prediction(MODEL, X)


@app.get("/model/comparison")
def model_comparison():
    """
    Return the model comparison results from training.
    This is the artifact proving genuine model-selection methodology.
    """
    if METADATA is None:
        return {"available": False, "message": "No model metadata found. Run training first."}

    comparison = METADATA.get('comparison_results')
    if not comparison:
        return {"available": False, "message": "No comparison results in metadata."}

    return {
        "available": True,
        "best_model": METADATA.get('model_name'),
        "results": comparison,
        "detailed_reports": METADATA.get('detailed_reports', {}),
        "trained_at": METADATA.get('trained_at'),
        "feature_order": METADATA.get('feature_order'),
        "gpu_used": METADATA.get('gpu_used', False),
    }


# ── Run with uvicorn ────────────────────────────────────────
if __name__ == '__main__':
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
