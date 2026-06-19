"""
FinGuard AI Service — Feedback-Triggered Retraining.

Pulls new labeled data, reruns train_and_compare, and replaces the
production model only if the new PR-AUC beats the existing one.
"""

import json
import os
import joblib
from app.training.train import train_and_compare


def retrain_if_improved(new_data_csv: str,
                        model_path: str = 'app/models/fraud_model.pkl',
                        metadata_path: str = 'app/models/model_metadata.json') -> dict:
    """
    Retrain the model on new data and replace the production artifact
    only if the new model is better (by PR-AUC).

    Args:
        new_data_csv: Path to the new/augmented cleaned CSV
        model_path: Path to the current production model
        metadata_path: Path to the current model metadata

    Returns:
        Dict with 'updated' flag and old/new PR-AUC scores
    """
    # Load current best score
    with open(metadata_path) as f:
        current_metadata = json.load(f)
    current_best_pr_auc = current_metadata['comparison_results'][current_metadata['model_name']]

    print(f"📊 Current best model: {current_metadata['model_name']} (PR-AUC = {current_best_pr_auc})")

    # Train candidate on new data
    candidate_model_path = model_path + '.candidate'
    candidate_meta_path = metadata_path + '.candidate'

    results, best_name = train_and_compare(
        new_data_csv, candidate_model_path, candidate_meta_path
    )
    new_pr_auc = results[best_name]['pr_auc']

    print(f"\n📊 New best model: {best_name} (PR-AUC = {new_pr_auc})")

    if new_pr_auc > current_best_pr_auc:
        # Replace production model
        os.replace(candidate_model_path, model_path)
        os.replace(candidate_meta_path, metadata_path)

        # Also replace merchant rates if they exist
        candidate_rates = candidate_model_path.replace('.pkl', '_merchant_rates.pkl')
        prod_rates = model_path.replace('.pkl', '_merchant_rates.pkl')
        if os.path.exists(candidate_rates):
            os.replace(candidate_rates, prod_rates)

        print(f"✅ Model UPGRADED: {current_best_pr_auc:.4f} → {new_pr_auc:.4f}")
        return {
            'updated': True,
            'old_model': current_metadata['model_name'],
            'new_model': best_name,
            'old_pr_auc': current_best_pr_auc,
            'new_pr_auc': new_pr_auc,
        }

    # Clean up candidate files
    for f in [candidate_model_path, candidate_meta_path,
              candidate_model_path.replace('.pkl', '_merchant_rates.pkl')]:
        if os.path.exists(f):
            os.remove(f)

    print(f"ℹ️ Model NOT upgraded: current {current_best_pr_auc:.4f} ≥ new {new_pr_auc:.4f}")
    return {
        'updated': False,
        'old_model': current_metadata['model_name'],
        'new_model': best_name,
        'old_pr_auc': current_best_pr_auc,
        'new_pr_auc': new_pr_auc,
    }
