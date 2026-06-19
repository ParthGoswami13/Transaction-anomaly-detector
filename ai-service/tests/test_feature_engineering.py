"""
Tests for FinGuard AI Service — Feature Engineering.
"""

import pandas as pd
import numpy as np
from app.features.feature_engineering import (
    add_geo_distance, add_time_features, add_amount_transform,
    add_category_risk, CATEGORY_RISK_MAP
)


def test_geo_distance_zero_when_same_location():
    """Distance should be 0 when cardholder and merchant are co-located."""
    df = pd.DataFrame([{
        'lat': 40.0, 'long': -74.0,
        'merch_lat': 40.0, 'merch_long': -74.0
    }])
    result = add_geo_distance(df)
    assert result['geo_distance_km'].iloc[0] == 0


def test_geo_distance_positive_when_different():
    """Distance should be positive when locations differ."""
    df = pd.DataFrame([{
        'lat': 40.7128, 'long': -74.0060,   # NYC
        'merch_lat': 34.0522, 'merch_long': -118.2437  # LA
    }])
    result = add_geo_distance(df)
    assert result['geo_distance_km'].iloc[0] > 3000  # ~3,940 km


def test_is_night_flag_early_morning():
    """3 AM should be flagged as night."""
    df = pd.DataFrame([{
        'trans_date_trans_time': pd.Timestamp('2026-01-01 03:00:00')
    }])
    result = add_time_features(df)
    assert result['is_night'].iloc[0] == 1


def test_is_night_flag_daytime():
    """2 PM should NOT be flagged as night."""
    df = pd.DataFrame([{
        'trans_date_trans_time': pd.Timestamp('2026-01-01 14:00:00')
    }])
    result = add_time_features(df)
    assert result['is_night'].iloc[0] == 0


def test_is_weekend_flag():
    """Saturday should be flagged as weekend."""
    # 2026-01-03 is a Saturday
    df = pd.DataFrame([{
        'trans_date_trans_time': pd.Timestamp('2026-01-03 12:00:00')
    }])
    result = add_time_features(df)
    assert result['is_weekend'].iloc[0] == 1


def test_log_amount_monotonic():
    """Log-transformed amounts should preserve ordering."""
    df = pd.DataFrame([{'amt': 10}, {'amt': 100}])
    result = add_amount_transform(df)
    assert result['log_amount'].iloc[1] > result['log_amount'].iloc[0]


def test_log_amount_zero():
    """Log1p(0) should be 0."""
    df = pd.DataFrame([{'amt': 0}])
    result = add_amount_transform(df)
    assert result['log_amount'].iloc[0] == 0.0


def test_category_risk_known():
    """Known categories should get their mapped risk score."""
    df = pd.DataFrame([{'category': 'grocery_pos'}])
    result = add_category_risk(df)
    assert result['category_risk_score'].iloc[0] == CATEGORY_RISK_MAP['grocery_pos']


def test_category_risk_unknown():
    """Unknown categories should get the default 0.3."""
    df = pd.DataFrame([{'category': 'totally_unknown'}])
    result = add_category_risk(df)
    assert result['category_risk_score'].iloc[0] == 0.3
