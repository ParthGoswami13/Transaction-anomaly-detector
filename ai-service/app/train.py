"""
FinGuard AI Service — Model Training & Ensemble Comparison.

Trains and compares: LogisticRegression, DecisionTree, SVM, RandomForest,
XGBoost, and a Stacking ensemble. Selects the best model by PR-AUC.

Usage (deferred — run manually when ready):
    python -m app.train --data data/transactions.csv
"""

import json
import os
import argparse
import sklearn
import joblib
import pandas as pd
import numpy as np
from datetime import datetime

from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.svm import SVC
from sklearn.ensemble import RandomForestClassifier, StackingClassifier
from xgboost import XGBClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import precision_recall_curve, auc, classification_report
from imblearn.over_sampling import SMOTE

from app.feature_engineering import build_features

FEATURE_COLS = [
    'log_amount',
    'geo_distance_km',
    'hour',
    'day_of_week',
    'is_night',
    'time_since_last_txn_min',
    'rolling_txn_count_1h',
]


def pr_auc_score(y_true, y_proba):
    """Compute area under the Precision-Recall curve."""
    precision, recall, _ = precision_recall_curve(y_true, y_proba)
    return auc(recall, precision)


def train_and_compare(csv_path: str, output_dir: str = 'app/models'):
    """
    Load data → engineer features → train 6 models → compare by PR-AUC
    → save best model + metadata.
    """
    print(f'📂 Loading data from {csv_path}...')
    df = pd.read_csv(csv_path, parse_dates=['trans_date_trans_time'], low_memory=False)

    print(f'🔧 Engineering features on {len(df)} rows...')
    df = build_features(df)
    df = df.dropna(subset=FEATURE_COLS)

    X = df[FEATURE_COLS].astype(float)
    y = df['is_fraud'].astype(int)

    print(f'📊 Class distribution: {dict(y.value_counts())}')

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=42
    )

    print('⚖️ Applying SMOTE...')
    X_train_res, y_train_res = SMOTE(random_state=42).fit_resample(X_train, y_train)

    candidates = {
        'logistic_regression': LogisticRegression(max_iter=1000),
        'decision_tree': DecisionTreeClassifier(max_depth=8),
        'svm': SVC(probability=True, kernel='rbf'),
        'random_forest': RandomForestClassifier(n_estimators=200, random_state=42, n_jobs=-1),
        'xgboost': XGBClassifier(eval_metric='logloss', use_label_encoder=False),
    }

    # Stacking: RF + XGBoost → LogisticRegression
    candidates['stacking'] = StackingClassifier(
        estimators=[
            ('rf', candidates['random_forest']),
            ('xgb', candidates['xgboost']),
        ],
        final_estimator=LogisticRegression(max_iter=1000),
    )

    results = {}
    for name, model in candidates.items():
        print(f'🏋️ Training {name}...')
        model.fit(X_train_res, y_train_res)
        y_proba = model.predict_proba(X_test)[:, 1]
        score = round(pr_auc_score(y_test, y_proba), 4)
        results[name] = {
            'pr_auc': score,
            'report': classification_report(y_test, model.predict(X_test), output_dict=True),
        }
        print(f'   ✅ {name}: PR-AUC = {score}')

    # Pick the best
    best_name = max(results, key=lambda k: results[k]['pr_auc'])
    best_model = candidates[best_name]
    print(f'\n🏆 Best model: {best_name} (PR-AUC = {results[best_name]["pr_auc"]})')

    # Save model + metadata
    os.makedirs(output_dir, exist_ok=True)
    model_path = os.path.join(output_dir, 'fraud_model.pkl')
    meta_path = os.path.join(output_dir, 'model_metadata.json')

    joblib.dump(best_model, model_path)
    print(f'💾 Model saved to {model_path}')

    metadata = {
        'model_name': best_name,
        'sklearn_version': sklearn.__version__,
        'feature_order': FEATURE_COLS,
        'trained_at': datetime.utcnow().isoformat(),
        'comparison_results': {k: v['pr_auc'] for k, v in results.items()},
    }
    with open(meta_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    print(f'📝 Metadata saved to {meta_path}')

    return results, best_name


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Train FinGuard fraud model')
    parser.add_argument('--data', required=True, help='Path to transactions CSV')
    parser.add_argument('--output', default='app/models', help='Output directory for model artifacts')
    args = parser.parse_args()

    train_and_compare(args.data, args.output)
