"""
FinGuard AI Service — Feature Engineering Pipeline.

Transforms raw transaction data into ML-ready features.
Each function takes and returns a pd.DataFrame, composable via build_features().
Every function is independently unit-testable.

Feature groups:
  1. Geo distance (cardholder ↔ merchant)
  2. Time features (hour, day_of_week, is_night, is_weekend)
  3. Multi-window velocity (5min, 1h, 24h counts/sums + time since last)
  4. Personal baseline deviation (rolling avg/std, z-score, new merchant flag)
  5. Category risk score (static risk tier)
  6. Merchant fraud rate (fitted on train fold only — leakage-safe)
  7. Log amount transform
  8. Benford's Law deviation
"""

import numpy as np
import pandas as pd
from geopy.distance import geodesic


# ── §5.1 Geo & merchant-distance features ──────────────────

def add_geo_distance(df: pd.DataFrame) -> pd.DataFrame:
    """Calculate geodesic distance (km) between cardholder and merchant locations."""
    def _calc(row):
        try:
            return geodesic(
                (row['lat'], row['long']),
                (row['merch_lat'], row['merch_long'])
            ).km
        except Exception:
            return 0.0

    df['geo_distance_km'] = df.apply(_calc, axis=1)
    return df


# ── §5.2 Time features ─────────────────────────────────────

def add_time_features(df: pd.DataFrame) -> pd.DataFrame:
    """Extract temporal features from the transaction timestamp."""
    if 'trans_date_trans_time' not in df.columns:
        return df

    dt_col = pd.to_datetime(df['trans_date_trans_time'], errors='coerce')
    df['hour'] = dt_col.dt.hour.fillna(0).astype(int)
    df['day_of_week'] = dt_col.dt.dayofweek.fillna(0).astype(int)
    df['is_night'] = df['hour'].apply(lambda h: int(h < 6 or h > 22))
    df['is_weekend'] = df['day_of_week'].apply(lambda d: int(d >= 5))
    return df


# ── §5.3 Multi-window velocity features ────────────────────

def add_velocity_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Multi-window velocity features that catch both slow-burn structuring
    and fast card-testing bursts.

    For single-transaction inference, defaults to safe values.
    For batch data (training), computes actual historical patterns.
    """
    if len(df) <= 1:
        # Single-transaction inference — no history available
        for w in ['5min', '1h', '24h']:
            df[f'txn_count_{w}'] = 1.0
            df[f'txn_sum_{w}'] = df['amt'].iloc[0] if 'amt' in df.columns else 0.0
        df['time_since_last_txn_min'] = 0.0
        return df

    card_col = 'cardNum'
    time_col = 'trans_date_trans_time'

    if card_col not in df.columns or time_col not in df.columns:
        for w in ['5min', '1h', '24h']:
            df[f'txn_count_{w}'] = 1.0
            df[f'txn_sum_{w}'] = 0.0
        df['time_since_last_txn_min'] = 0.0
        return df

    df = df.sort_values([card_col, time_col])
    df[time_col] = pd.to_datetime(df[time_col], errors='coerce')
    df = df.set_index(time_col)

    for window, label in [('5min', '5min'), ('1h', '1h'), ('24h', '24h')]:
        grouped = df.groupby(card_col)['amt']
        df[f'txn_count_{label}'] = grouped.rolling(window).count().reset_index(level=0, drop=True)
        df[f'txn_sum_{label}'] = grouped.rolling(window).sum().reset_index(level=0, drop=True)

    # Time since last transaction (minutes)
    df['time_since_last_txn_min'] = (
        df.groupby(card_col).apply(
            lambda g: g.index.to_series().diff().dt.total_seconds() / 60
        ).reset_index(level=0, drop=True)
    )

    df = df.reset_index()

    # Fill NaN for first transactions per card
    for w in ['5min', '1h', '24h']:
        df[f'txn_count_{w}'] = df[f'txn_count_{w}'].fillna(1.0)
        df[f'txn_sum_{w}'] = df[f'txn_sum_{w}'].fillna(0.0)
    df['time_since_last_txn_min'] = df['time_since_last_txn_min'].fillna(0.0)

    return df


# ── §5.4 Personal baseline deviation ───────────────────────

def add_personal_baseline_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Fraud is often 'unusual for this person,' not unusual in absolute terms.
    Rolling window of last 30 transactions per card.
    """
    if len(df) <= 1:
        df['card_avg_amt_30'] = df['amt'].iloc[0] if 'amt' in df.columns else 0.0
        df['card_std_amt_30'] = 0.0
        df['amt_zscore_personal'] = 0.0
        df['amt_to_avg_ratio'] = 1.0
        df['is_new_merchant_for_card'] = 1
        return df

    df = df.sort_values(['cardNum', 'trans_date_trans_time'])
    rolling = df.groupby('cardNum')['amt'].rolling(window=30, min_periods=5)

    df['card_avg_amt_30'] = rolling.mean().reset_index(level=0, drop=True)
    df['card_std_amt_30'] = rolling.std().reset_index(level=0, drop=True)
    df['amt_zscore_personal'] = (df['amt'] - df['card_avg_amt_30']) / df['card_std_amt_30'].replace(0, 1)
    df['amt_to_avg_ratio'] = df['amt'] / df['card_avg_amt_30'].replace(0, 1)

    # Track whether this card has visited this merchant before
    seen_merchants = df.groupby('cardNum')['merchant'].apply(
        lambda s: s.duplicated(keep='first')
    ).reset_index(level=0, drop=True)
    df['is_new_merchant_for_card'] = (~seen_merchants).astype(int)

    # Fill NaN for cards with < 5 transactions (min_periods not met)
    df['card_avg_amt_30'] = df['card_avg_amt_30'].fillna(df['amt'])
    df['card_std_amt_30'] = df['card_std_amt_30'].fillna(0.0)
    df['amt_zscore_personal'] = df['amt_zscore_personal'].fillna(0.0)
    df['amt_to_avg_ratio'] = df['amt_to_avg_ratio'].fillna(1.0)

    return df


# ── §5.5 Merchant-category risk & historical fraud rate ────

CATEGORY_RISK_MAP = {
    'gambling': 0.9,
    'crypto': 0.85,
    'misc_net': 0.6,
    'shopping_net': 0.55,
    'shopping_pos': 0.35,
    'misc_pos': 0.35,
    'gas_transport': 0.3,
    'food_dining': 0.25,
    'entertainment': 0.25,
    'personal_care': 0.2,
    'kids_pets': 0.2,
    'travel': 0.3,
    'grocery_pos': 0.1,
    'grocery_net': 0.15,
    'health_fitness': 0.15,
    'home': 0.1,
}


def add_category_risk(df: pd.DataFrame) -> pd.DataFrame:
    """Map merchant category to a static risk score."""
    df['category_risk_score'] = df['category'].map(CATEGORY_RISK_MAP).fillna(0.3)
    return df


def fit_merchant_fraud_rate(train_df: pd.DataFrame) -> tuple:
    """
    Fit merchant fraud rate on the TRAINING fold only.
    Returns (rates_dict, global_rate) to apply via transform_merchant_fraud_rate.

    WARNING: This must NEVER be computed on the full dataset before splitting —
    that would leak test-set fraud labels into training.
    """
    rates = train_df.groupby('merchant')['is_fraud'].mean()
    global_rate = train_df['is_fraud'].mean()
    return rates.to_dict(), global_rate


def transform_merchant_fraud_rate(df: pd.DataFrame, rates_dict: dict, global_rate: float) -> pd.DataFrame:
    """Apply pre-fitted merchant fraud rates (leakage-safe)."""
    df['merchant_fraud_rate'] = df['merchant'].map(rates_dict).fillna(global_rate)
    return df


# ── §5.6 Amount transform & Benford's Law deviation ───────

def add_amount_transform(df: pd.DataFrame) -> pd.DataFrame:
    """Log-transform the transaction amount to reduce skewness."""
    amt_col = 'amt' if 'amt' in df.columns else 'amount'
    if amt_col in df.columns:
        df['log_amount'] = np.log1p(df[amt_col].astype(float).fillna(0))
    else:
        df['log_amount'] = 0.0
    return df


BENFORD_EXPECTED = {d: np.log10(1 + 1 / d) for d in range(1, 10)}


def add_benford_deviation(df: pd.DataFrame, window_size: int = 50) -> pd.DataFrame:
    """
    Compute rolling Benford's Law deviation per card.
    Structuring schemes often produce non-Benford digit distributions
    because amounts are artificially chosen to stay under reporting thresholds.
    """
    if len(df) <= 1:
        df['benford_deviation'] = 0.0
        return df

    def leading_digit(x):
        s = str(abs(x)).lstrip('0.')
        return int(s[0]) if s and s[0] != '0' else 1

    df = df.sort_values(['cardNum', 'trans_date_trans_time'])
    df['_leading_digit'] = df['amt'].apply(leading_digit)

    def deviation_for_group(g):
        observed = g['_leading_digit'].rolling(window_size, min_periods=10).apply(
            lambda window: sum(
                abs((window == d).mean() - BENFORD_EXPECTED[d]) for d in range(1, 10)
            ), raw=False
        )
        return observed

    df['benford_deviation'] = df.groupby('cardNum', group_keys=False).apply(deviation_for_group)
    df['benford_deviation'] = df['benford_deviation'].fillna(0.0)
    df = df.drop(columns=['_leading_digit'])
    return df


# ── §5.7 Graph-derived features (for sender/receiver data only) ──

def attach_graph_features(df: pd.DataFrame, graph_feature_lookup: dict,
                          account_col: str = 'sender_account') -> pd.DataFrame:
    """
    Merge graph-level features into the tabular feature table.
    Only used for the AML/transfer model, NOT the card-fraud model.

    graph_feature_lookup: {account_id: {'degree_centrality': ..., 'pagerank': ..., 'clustering_coef': ...}}
    """
    df['degree_centrality'] = df[account_col].map(
        lambda a: graph_feature_lookup.get(a, {}).get('degree_centrality', 0)
    )
    df['pagerank'] = df[account_col].map(
        lambda a: graph_feature_lookup.get(a, {}).get('pagerank', 0)
    )
    df['clustering_coef'] = df[account_col].map(
        lambda a: graph_feature_lookup.get(a, {}).get('clustering_coef', 0)
    )
    return df


# ── §5.8 Full pipeline composition ─────────────────────────

def build_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Full feature engineering pipeline.
    Applies all feature groups in the correct order.
    """
    df = df.copy()

    # Normalize column names if needed
    col_map = {
        'card_num': 'cardNum',
        'merchLat': 'merch_lat',
        'merchLong': 'merch_long',
        'transDateTime': 'trans_date_trans_time',
        'Amount': 'amt',
        'amount': 'amt',
    }
    for old, new in col_map.items():
        if old in df.columns and new not in df.columns:
            df[new] = df[old]

    # Ensure datetime parsing
    if 'trans_date_trans_time' in df.columns:
        df['trans_date_trans_time'] = pd.to_datetime(df['trans_date_trans_time'], errors='coerce')

    df = add_geo_distance(df)
    df = add_time_features(df)
    df = add_velocity_features(df)
    df = add_personal_baseline_features(df)
    df = add_category_risk(df)
    df = add_amount_transform(df)
    df = add_benford_deviation(df)

    return df


# The 19 candidate features that the feature selection step will rank/prune
CANDIDATE_FEATURE_COLS = [
    'log_amount', 'geo_distance_km', 'hour', 'day_of_week', 'is_night', 'is_weekend',
    'txn_count_5min', 'txn_sum_5min', 'txn_count_1h', 'txn_sum_1h',
    'txn_count_24h', 'txn_sum_24h', 'time_since_last_txn_min',
    'amt_zscore_personal', 'amt_to_avg_ratio', 'is_new_merchant_for_card',
    'category_risk_score', 'merchant_fraud_rate', 'benford_deviation'
]
