"""
FinGuard AI Service — Model Explainability via SHAP.

Provides feature-level contribution explanations for fraud predictions
using SHAP TreeExplainer (for tree-based models).
"""

import shap
import pandas as pd
from typing import Dict, List


def explain_prediction(model, X: pd.DataFrame) -> Dict:
    """
    Generate SHAP-based explanations for a prediction.

    Args:
        model: Trained sklearn-compatible model
        X: Feature DataFrame (single row or batch)

    Returns:
        Dictionary with top contributing features and their SHAP values
    """
    try:
        explainer = shap.TreeExplainer(model)
        shap_values = explainer.shap_values(X)

        # Handle different SHAP output formats
        if isinstance(shap_values, list):
            # Binary classification: [class_0_values, class_1_values]
            vals = shap_values[1][0]  # First sample, positive class
        elif len(shap_values.shape) == 3:
            vals = shap_values[0, :, 1]
        else:
            vals = shap_values[0]

        contributions = dict(zip(X.columns, vals))
        sorted_contributions = sorted(
            contributions.items(), key=lambda x: abs(x[1]), reverse=True
        )

        return {
            'top_factors': [
                {'feature': feat, 'contribution': round(float(val), 4)}
                for feat, val in sorted_contributions[:5]
            ],
            'base_value': round(float(explainer.expected_value[1]
                                      if isinstance(explainer.expected_value, list)
                                      else explainer.expected_value), 4),
        }

    except Exception as e:
        # Fallback: feature importance if SHAP fails (e.g., non-tree model)
        try:
            if hasattr(model, 'feature_importances_'):
                importances = dict(zip(X.columns, model.feature_importances_))
                sorted_imp = sorted(importances.items(), key=lambda x: x[1], reverse=True)
                return {
                    'top_factors': [
                        {'feature': feat, 'importance': round(float(val), 4)}
                        for feat, val in sorted_imp[:5]
                    ],
                    'method': 'feature_importance_fallback',
                }
        except Exception:
            pass

        return {
            'error': f'Explanation unavailable: {str(e)}',
            'top_factors': [],
        }
