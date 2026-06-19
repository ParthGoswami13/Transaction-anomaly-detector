"""
FinGuard AI Service — Raw CSV → Cleaned Training Table.

Drops junk columns from the hackathon dataset, normalizes the amount column,
parses datetime fields, and deduplicates by transactionId.
"""

import os
import sys
import pandas as pd


# The 15 columns we actually need from the raw 41-column dataset
KEEP_COLS = [
    'trans_date_trans_time', 'cardNum', 'merchant', 'category', 'amt',
    'gender', 'lat', 'long', 'city_pop', 'job', 'dob',
    'transactionId', 'merch_lat', 'merch_long', 'is_fraud'
]


def clean_raw_dataset(raw_path: str, output_path: str) -> pd.DataFrame:
    """
    Clean the raw hackathon CSV:
    1. Normalize the 'Amount' column → 'amt' (raw 'amt' is all zeros in this dataset)
    2. Keep only the 15 required columns
    3. Drop rows with null values in critical numeric columns
    4. Deduplicate by transactionId
    5. Parse datetime columns
    6. Enforce is_fraud as int

    Args:
        raw_path: Path to the raw hackathon_ai_dataset.csv
        output_path: Path to write the cleaned CSV

    Returns:
        Cleaned DataFrame
    """
    print(f"📂 Loading raw dataset from {raw_path}...")
    df = pd.read_csv(raw_path, low_memory=False)
    print(f"   Raw shape: {df.shape} ({len(df.columns)} columns)")

    # Normalize the amount column — raw file has Amount/amt/amount duplicates
    # In this dataset, 'amt' is all zeros; actual values are in 'Amount'
    if 'Amount' in df.columns:
        df['amt'] = df['Amount']
    elif 'amount' in df.columns and 'amt' not in df.columns:
        df['amt'] = df['amount']

    # Verify all required columns exist before subsetting
    missing_cols = [c for c in KEEP_COLS if c not in df.columns]
    if missing_cols:
        raise ValueError(f"Raw dataset missing required columns: {missing_cols}")

    df = df[KEEP_COLS].copy()
    print(f"   After column selection: {df.shape}")

    # Drop rows with null values in critical columns
    df = df.dropna(subset=['amt', 'is_fraud', 'lat', 'long', 'merch_lat', 'merch_long'])
    print(f"   After dropping nulls: {df.shape}")

    # Deduplicate by transactionId
    df = df.drop_duplicates(subset=['transactionId'])
    print(f"   After deduplication: {df.shape}")

    # Parse datetime columns — dataset has mixed formats
    df['trans_date_trans_time'] = pd.to_datetime(df['trans_date_trans_time'], format='mixed', dayfirst=False)
    df['dob'] = pd.to_datetime(df['dob'], format='mixed', dayfirst=False)

    # Enforce target column type
    df['is_fraud'] = df['is_fraud'].astype(int)

    # Ensure output directory exists
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    df.to_csv(output_path, index=False)
    print(f"✅ Cleaned dataset saved to {output_path}")
    print(f"   Final shape: {df.shape}")
    print(f"   Fraud rate: {df['is_fraud'].mean():.4f} ({df['is_fraud'].sum()} fraudulent / {len(df)} total)")

    return df


if __name__ == '__main__':
    # Default paths — adjust as needed
    raw = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
        os.path.dirname(__file__), '..', '..', '..', '..', 'ai_server', 'ai_server', 'hackathon_ai_dataset.csv'
    )
    out = sys.argv[2] if len(sys.argv) > 2 else os.path.join(
        os.path.dirname(__file__), 'cleaned_transactions.csv'
    )
    clean_raw_dataset(raw, out)
