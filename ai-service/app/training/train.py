"""
FinGuard AI Service — Model Training & Ensemble Comparison.

Trains and compares 6 models:
  1. Logistic Regression
  2. Decision Tree
  3. SVM
  4. Random Forest
  5. XGBoost (GPU-accelerated on NVIDIA RTX 3050)
  6. Stacking (RF + XGBoost → LR)

Selects the best model by PR-AUC and saves it as the production artifact.
SMOTE is used to handle the ~1% fraud class imbalance.

Usage:
    cd ai-service
    python -m app.training.train
"""

import json
import os
import sys
import time
import argparse
import sklearn
import joblib
import pandas as pd
import numpy as np
from datetime import datetime, timezone

from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.svm import SVC
from sklearn.ensemble import RandomForestClassifier, StackingClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import precision_recall_curve, auc, classification_report
from sklearn.preprocessing import StandardScaler
from imblearn.over_sampling import SMOTE

# Add parent paths for module imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.features.feature_engineering import (
    build_features, CANDIDATE_FEATURE_COLS,
    fit_merchant_fraud_rate, transform_merchant_fraud_rate
)
from app.features.feature_selection import select_features_rfe, rank_by_mutual_information


def _detect_gpu() -> bool:
    """Check if NVIDIA GPU is available for XGBoost CUDA training."""
    try:
        import subprocess
        result = subprocess.run(
            ['nvidia-smi', '--query-gpu=name', '--format=csv,noheader'],
            capture_output=True, text=True, timeout=5
        )
        if result.returncode == 0 and result.stdout.strip():
            print(f"🎮 GPU detected: {result.stdout.strip()}")
            return True
    except Exception:
        pass
    print("ℹ️  No GPU detected — XGBoost will use CPU")
    return False


def pr_auc_score(y_true, y_proba):
    """Compute area under the Precision-Recall curve."""
    precision, recall, _ = precision_recall_curve(y_true, y_proba)
    return auc(recall, precision)


def train_and_compare(cleaned_csv_path: str,
                      model_out_path: str = 'app/models/fraud_model.pkl',
                      metadata_out_path: str = 'app/models/model_metadata.json'):
    """
    Full training pipeline:
      1. Load cleaned CSV
      2. Engineer all 19 features
      3. Stratified 80/20 split
      4. Fit merchant fraud rate on train fold only (leakage-safe)
      5. Feature selection via RFECV
      6. SMOTE oversampling on training fold
      7. Train 6 candidate models (XGBoost on GPU if available)
      8. Evaluate by PR-AUC
      9. Save best model + metadata + merchant rates
    """
    total_start = time.time()

    # ── Step 1: Load data ──
    print("=" * 70)
    print("🚀 FinGuard AI — Model Training Pipeline")
    print("=" * 70)

    print(f"\n📂 Loading cleaned data from {cleaned_csv_path}...")
    df = pd.read_csv(cleaned_csv_path, parse_dates=['trans_date_trans_time', 'dob'])
    print(f"   Loaded {len(df)} rows")

    # ── Step 2: Feature engineering ──
    print(f"\n🔧 Engineering features...")
    feat_start = time.time()
    df = build_features(df)
    print(f"   Feature engineering took {time.time() - feat_start:.1f}s")

    # Drop rows where any candidate feature is NaN
    df = df.dropna(subset=[c for c in CANDIDATE_FEATURE_COLS if c in df.columns and c != 'merchant_fraud_rate'])
    print(f"   Rows after NaN drop: {len(df)}")

    # ── Step 3: Stratified split ──
    print(f"\n📊 Splitting data (80/20, stratified)...")
    train_df, test_df = train_test_split(
        df, test_size=0.2, stratify=df['is_fraud'], random_state=42
    )
    print(f"   Train: {len(train_df)} rows ({train_df['is_fraud'].mean():.4f} fraud rate)")
    print(f"   Test:  {len(test_df)} rows ({test_df['is_fraud'].mean():.4f} fraud rate)")

    # ── Step 4: Leakage-safe merchant fraud rate ──
    print(f"\n🏪 Fitting merchant fraud rate on train fold only...")
    rates_dict, global_rate = fit_merchant_fraud_rate(train_df)
    train_df = transform_merchant_fraud_rate(train_df, rates_dict, global_rate)
    test_df = transform_merchant_fraud_rate(test_df, rates_dict, global_rate)
    print(f"   {len(rates_dict)} unique merchants, global fraud rate: {global_rate:.6f}")

    X_train = train_df[CANDIDATE_FEATURE_COLS].astype(float)
    y_train = train_df['is_fraud'].astype(int)
    X_test = test_df[CANDIDATE_FEATURE_COLS].astype(float)
    y_test = test_df['is_fraud'].astype(int)

    # Fill any remaining NaN with 0
    X_train = X_train.fillna(0.0)
    X_test = X_test.fillna(0.0)

    # ── Step 5: Feature selection ──
    print(f"\n🔬 Feature selection...")
    mi_scores = rank_by_mutual_information(X_train, y_train)
    print(f"   Mutual Information ranking:\n{mi_scores.to_string()}\n")

    selected_features = select_features_rfe(X_train, y_train)
    X_train = X_train[selected_features]
    X_test = X_test[selected_features]

    # ── Step 6: SMOTE ──
    print(f"\n⚖️ Applying SMOTE oversampling...")
    smote_start = time.time()
    X_train_res, y_train_res = SMOTE(random_state=42).fit_resample(X_train, y_train)
    print(f"   Before SMOTE: {dict(y_train.value_counts())}")
    print(f"   After SMOTE:  {dict(y_train_res.value_counts())}")
    print(f"   SMOTE took {time.time() - smote_start:.1f}s")

    # ── Step 7: Train all candidates ──
    gpu_available = _detect_gpu()

    # XGBoost config: use GPU if available
    xgb_params = {
        'eval_metric': 'logloss',
        'random_state': 42,
        'n_estimators': 300,
        'max_depth': 6,
        'learning_rate': 0.1,
    }
    if gpu_available:
        xgb_params['device'] = 'cuda'
        xgb_params['tree_method'] = 'hist'  # GPU-accelerated histogram method
        print("   🎮 XGBoost will train on GPU (CUDA)")

    # Import XGBoost here to allow graceful fallback
    from xgboost import XGBClassifier

    candidates = {
        'logistic_regression': LogisticRegression(max_iter=1000, random_state=42),
        'decision_tree': DecisionTreeClassifier(max_depth=8, random_state=42),
        'svm': SVC(probability=True, kernel='rbf', random_state=42),
        'random_forest': RandomForestClassifier(
            n_estimators=200, random_state=42, n_jobs=-1
        ),
        'xgboost': XGBClassifier(**xgb_params),
    }

    # Stacking: RF + XGBoost → Logistic Regression meta-learner
    xgb_for_stack = XGBClassifier(**xgb_params)
    rf_for_stack = RandomForestClassifier(
        n_estimators=200, random_state=42, n_jobs=-1
    )
    candidates['stacking'] = StackingClassifier(
        estimators=[('rf', rf_for_stack), ('xgb', xgb_for_stack)],
        final_estimator=LogisticRegression(max_iter=1000),
        n_jobs=-1,
    )

    print(f"\n{'=' * 70}")
    print(f"🏋️ Training 6 candidate models...")
    print(f"{'=' * 70}")

    results = {}
    for name, model in candidates.items():
        print(f"\n▶ Training {name}...")
        t0 = time.time()

        try:
            # SVM benefits from feature scaling
            if name == 'svm':
                scaler = StandardScaler()
                X_fit = pd.DataFrame(
                    scaler.fit_transform(X_train_res),
                    columns=X_train_res.columns
                )
                X_eval = pd.DataFrame(
                    scaler.transform(X_test),
                    columns=X_test.columns
                )
                model.fit(X_fit, y_train_res)
                y_proba = model.predict_proba(X_eval)[:, 1]
                y_pred = model.predict(X_eval)
            else:
                model.fit(X_train_res, y_train_res)
                y_proba = model.predict_proba(X_test)[:, 1]
                y_pred = model.predict(X_test)

            score = round(pr_auc_score(y_test, y_proba), 4)
            report = classification_report(y_test, y_pred, output_dict=True)

            results[name] = {
                'pr_auc': score,
                'report': report,
                'train_time_s': round(time.time() - t0, 1),
            }

            print(f"   ✅ {name}: PR-AUC = {score} ({time.time() - t0:.1f}s)")
            print(f"      Precision(fraud): {report.get('1', {}).get('precision', 0):.3f}")
            print(f"      Recall(fraud):    {report.get('1', {}).get('recall', 0):.3f}")

        except Exception as e:
            print(f"   ❌ {name} FAILED: {e}")
            results[name] = {'pr_auc': 0.0, 'report': {}, 'error': str(e)}

    # ── Step 8: Select best ──
    best_name = max(results, key=lambda k: results[k]['pr_auc'])
    best_model = candidates[best_name]

    print(f"\n{'=' * 70}")
    print(f"🏆 BEST MODEL: {best_name} (PR-AUC = {results[best_name]['pr_auc']})")
    print(f"{'=' * 70}")

    # Print comparison table
    print(f"\n📊 Model Comparison (sorted by PR-AUC):")
    print(f"{'Model':<25} {'PR-AUC':>8} {'Time':>8}")
    print(f"{'-' * 45}")
    sorted_results = sorted(results.items(), key=lambda x: x[1]['pr_auc'], reverse=True)
    for name, r in sorted_results:
        marker = " 👑" if name == best_name else ""
        print(f"{name:<25} {r['pr_auc']:>8.4f} {r.get('train_time_s', 0):>7.1f}s{marker}")

    # ── Step 9: Save artifacts ──
    os.makedirs(os.path.dirname(model_out_path), exist_ok=True)

    # Save the best model
    joblib.dump(best_model, model_out_path)
    print(f"\n💾 Model saved to {model_out_path}")

    # Save merchant fraud rates (needed at serving time)
    rates_path = model_out_path.replace('.pkl', '_merchant_rates.pkl')
    joblib.dump({'rates_dict': rates_dict, 'global_rate': global_rate}, rates_path)
    print(f"💾 Merchant rates saved to {rates_path}")

    # Save metadata
    metadata = {
        'model_name': best_name,
        'sklearn_version': sklearn.__version__,
        'feature_order': selected_features,
        'all_candidate_features': CANDIDATE_FEATURE_COLS,
        'trained_at': datetime.now(timezone.utc).isoformat(),
        'comparison_results': {k: v['pr_auc'] for k, v in results.items()},
        'detailed_reports': {
            k: {
                'pr_auc': v['pr_auc'],
                'train_time_s': v.get('train_time_s', 0),
                'precision_fraud': v.get('report', {}).get('1', {}).get('precision', 0),
                'recall_fraud': v.get('report', {}).get('1', {}).get('recall', 0),
                'f1_fraud': v.get('report', {}).get('1', {}).get('f1-score', 0),
            }
            for k, v in results.items()
        },
        'training_rows': len(train_df),
        'test_rows': len(test_df),
        'fraud_rate_train': float(y_train.mean()),
        'gpu_used': gpu_available,
        'mi_scores': {k: round(float(v), 6) for k, v in mi_scores.items()},
        'dropped_features': [c for c in CANDIDATE_FEATURE_COLS if c not in selected_features],
    }
    with open(metadata_out_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    print(f"📝 Metadata saved to {metadata_out_path}")

    total_time = time.time() - total_start
    print(f"\n⏱️ Total training pipeline time: {total_time:.1f}s ({total_time / 60:.1f} min)")

    return results, best_name


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Train FinGuard fraud detection model')
    parser.add_argument(
        '--data',
        default=os.path.join(os.path.dirname(__file__), '..', 'data', 'cleaned_transactions.csv'),
        help='Path to cleaned transactions CSV'
    )
    parser.add_argument(
        '--model-out',
        default=os.path.join(os.path.dirname(__file__), '..', 'models', 'fraud_model.pkl'),
        help='Output path for the best model pickle'
    )
    parser.add_argument(
        '--meta-out',
        default=os.path.join(os.path.dirname(__file__), '..', 'models', 'model_metadata.json'),
        help='Output path for model metadata JSON'
    )
    args = parser.parse_args()

    train_and_compare(args.data, args.model_out, args.meta_out)
