"""
FinGuard AI Service — Feature Selection.

After engineering ~19 candidate features, select the subset that actually
earns its place rather than feeding everything in blindly.

Two methods:
  1. Mutual information ranking (fast, univariate)
  2. RFECV with RandomForest (thorough, multivariate, cross-validated)
"""

import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.feature_selection import RFECV, mutual_info_classif


def rank_by_mutual_information(X: pd.DataFrame, y) -> pd.Series:
    """
    Rank features by mutual information with the target variable.
    Fast univariate filter — useful for quick screening.

    Returns:
        Series of MI scores sorted descending by importance.
    """
    scores = mutual_info_classif(X, y, random_state=42)
    return pd.Series(scores, index=X.columns).sort_values(ascending=False)


def select_features_rfe(X: pd.DataFrame, y, min_features: int = 8) -> list:
    """
    Recursive Feature Elimination with Cross-Validation (RFECV).

    Uses a RandomForest estimator with average_precision scoring
    (appropriate for the heavily imbalanced fraud detection problem).

    Args:
        X: Feature DataFrame
        y: Target Series
        min_features: Minimum features to keep

    Returns:
        List of selected feature column names.
    """
    print(f"🔍 Running RFECV feature selection (starting with {len(X.columns)} features, min={min_features})...")

    estimator = RandomForestClassifier(
        n_estimators=200,
        random_state=42,
        n_jobs=-1
    )

    selector = RFECV(
        estimator,
        step=1,
        min_features_to_select=min_features,
        cv=5,
        scoring='average_precision',
        n_jobs=-1,
    )
    selector.fit(X, y)

    selected = list(X.columns[selector.support_])
    dropped = list(X.columns[~selector.support_])

    print(f"   ✅ Selected {len(selected)} features: {selected}")
    if dropped:
        print(f"   ❌ Dropped {len(dropped)} features: {dropped}")

    return selected
