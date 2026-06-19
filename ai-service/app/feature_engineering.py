"""
FinGuard AI Service — Feature Engineering Pipeline.
Transforms raw transaction data into ML-ready features.
"""

import numpy as np
import pandas as pd
from geopy.distance import geodesic


def add_geo_distance(df: pd.DataFrame) -> pd.DataFrame:
    """Calculate geodesic distance (km) between cardholder and merchant locations."""
    def _calc_distance(row):
        try:
            return geodesic(
                (row['lat'], row['long']),
                (row['merch_lat'], row['merch_long'])
            ).km
        except Exception:
            return 0.0

    df['geo_distance_km'] = df.apply(_calc_distance, axis=1)
    return df


def add_time_features(df: pd.DataFrame) -> pd.DataFrame:
    """Extract temporal features from the transaction timestamp."""
    if 'trans_date_trans_time' not in df.columns:
        return df

    dt_col = pd.to_datetime(df['trans_date_trans_time'], errors='coerce')
    df['hour'] = dt_col.dt.hour.fillna(0).astype(int)
    df['day_of_week'] = dt_col.dt.dayofweek.fillna(0).astype(int)
    df['is_night'] = ((df['hour'] >= 22) | (df['hour'] <= 5)).astype(int)
    df['is_weekend'] = (df['day_of_week'] >= 5).astype(int)

    return df


def add_velocity_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Add transaction velocity features.
    For single-transaction inference, these default to NaN → filled with 0.
    For batch data (training), they reflect actual historical patterns.
    """
    if len(df) <= 1:
        df['time_since_last_txn_min'] = 0.0
        df['rolling_txn_count_1h'] = 1.0
        return df

    card_col = 'cc_num' if 'cc_num' in df.columns else 'cardNum'
    time_col = 'trans_date_trans_time'

    if card_col not in df.columns or time_col not in df.columns:
        df['time_since_last_txn_min'] = 0.0
        df['rolling_txn_count_1h'] = 1.0
        return df

    df = df.sort_values([card_col, time_col])
    df[time_col] = pd.to_datetime(df[time_col], errors='coerce')

    df['time_since_last_txn_min'] = (
        df.groupby(card_col)[time_col]
        .diff()
        .dt.total_seconds()
        .div(60)
        .fillna(0)
    )

    # Rolling count within 1-hour window per card
    try:
        df['rolling_txn_count_1h'] = (
            df.set_index(time_col)
            .groupby(card_col)['amount']
            .rolling('1h')
            .count()
            .reset_index(drop=True)
            .fillna(1)
        )
    except Exception:
        df['rolling_txn_count_1h'] = 1.0

    return df


def add_amount_transform(df: pd.DataFrame) -> pd.DataFrame:
    """Log-transform the transaction amount to reduce skewness."""
    amt_col = 'amt' if 'amt' in df.columns else 'amount'
    if amt_col in df.columns:
        df['log_amount'] = np.log1p(df[amt_col].astype(float).fillna(0))
    else:
        df['log_amount'] = 0.0
    return df


def build_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Full feature engineering pipeline.
    Applies: geo distance → time features → velocity → amount transform.
    """
    df = df.copy()

    # Normalize column names if needed (handle both camelCase and snake_case)
    col_map = {
        'cardNum': 'cardNum',
        'card_num': 'cardNum',
        'merch_lat': 'merch_lat',
        'merchLat': 'merch_lat',
        'merch_long': 'merch_long',
        'merchLong': 'merch_long',
        'transDateTime': 'trans_date_trans_time',
    }
    for old, new in col_map.items():
        if old in df.columns and new not in df.columns:
            df[new] = df[old]

    df = add_geo_distance(df)
    df = add_time_features(df)
    df = add_velocity_features(df)
    df = add_amount_transform(df)

    return df
