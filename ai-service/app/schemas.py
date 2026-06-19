"""
FinGuard AI Service — Pydantic Request/Response Schemas.
"""

from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


# ── Request Schemas ─────────────────────────────────────────

class TransactionIn(BaseModel):
    """Card transaction input for fraud scoring (Gate 1)."""
    cardNum: str
    merchant: str
    category: str
    amt: float = Field(gt=0, description="Transaction amount")
    trans_date_trans_time: datetime
    lat: float
    long: float
    merch_lat: float
    merch_long: float


class TransferIn(BaseModel):
    """Account transfer input for smurfing detection (Gate 2)."""
    sender_account: str
    receiver_account: str
    amount: float = Field(gt=0, description="Transfer amount")
    timestamp: datetime


# ── Response Schemas ────────────────────────────────────────

class FraudDetectionResult(BaseModel):
    """Gate 1 fraud scoring result."""
    result: str  # "Fraud" or "Legit"
    confidence: float
    flags: list[str]


class SmurfingResult(BaseModel):
    """Gate 2 smurfing/structuring detection result."""
    is_smurfing: bool
    pattern: Optional[str] = None


class AnalyzeResponse(BaseModel):
    """Combined response from /analyze_transaction."""
    fraud_detection: FraudDetectionResult
    smurfing_detection: SmurfingResult
