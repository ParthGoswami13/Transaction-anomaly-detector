"""
FinGuard AI Service — SHAP Explainability.

Provides human-readable explanations for fraud predictions
using SHAP (SHapley Additive exPlanations).

Automatically selects the appropriate explainer based on model type:
  - TreeExplainer: RF, XGBoost, Decision Tree, tree-based Stacking
  - LinearExplainer: Logistic Regression
  - KernelExplainer: SVM, other non-standard models (fallback)
"""

import shap
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.svm import SVC
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import (
    RandomForestClassifier, GradientBoostingClassifier,
    StackingClassifier
)


def _is_tree_model(model) -> bool:
    """Check if a model is tree-based (directly or as a stacking ensemble)."""
    tree_types = (
        DecisionTreeClassifier,
        RandomForestClassifier,
        GradientBoostingClassifier,
    )

    # Direct tree model
    if isinstance(model, tree_types):
        return True

    # XGBoost
    try:
        from xgboost import XGBClassifier
        if isinstance(model, XGBClassifier):
            return True
    except ImportError:
        pass

    # Stacking with tree-based base learners
    if isinstance(model, StackingClassifier):
        return all(
            _is_tree_model(est) for _, est in model.estimators_
        )

    return False


def _is_linear_model(model) -> bool:
    """Check if a model is a linear model."""
    return isinstance(model, LogisticRegression)


def explain_prediction(model, X: pd.DataFrame, top_n: int = 5) -> dict:
    """
    Generate SHAP-based explanations for a fraud prediction.

    Selects the appropriate explainer based on the model type:
      - TreeExplainer for tree-based models (fast, exact)
      - LinearExplainer for logistic regression
      - KernelExplainer for everything else (slow but universal)

    Args:
        model: Trained sklearn-compatible classifier
        X: Feature DataFrame (single row or small batch)
        top_n: Number of top contributing features to return

    Returns:
        Dict with top_factors list and base_value
    """
    try:
        if _is_tree_model(model):
            explainer = shap.TreeExplainer(model)
        elif _is_linear_model(model):
            explainer = shap.LinearExplainer(model, X)
        else:
            # KernelExplainer — universal fallback (slower)
            explainer = shap.KernelExplainer(model.predict_proba, X)

        shap_values = explainer.shap_values(X)

        # Handle different SHAP output formats
        if isinstance(shap_values, list):
            # Binary classification: [class_0_values, class_1_values]
            values = shap_values[1][0]  # First sample, positive class
        elif hasattr(shap_values, 'shape') and len(shap_values.shape) == 3:
            values = shap_values[0, :, 1]
        else:
            values = shap_values[0]

        # Sort by absolute contribution
        contributions = sorted(
            zip(X.columns, values),
            key=lambda x: abs(x[1]),
            reverse=True
        )

        # Get base value
        if isinstance(explainer.expected_value, (list, np.ndarray)):
            base_val = float(explainer.expected_value[1])
        else:
            base_val = float(explainer.expected_value)

        return {
            "top_factors": [
                {"feature": feat, "contribution": round(float(val), 4)}
                for feat, val in contributions[:top_n]
            ],
            "base_value": round(base_val, 4),
        }

    except Exception as e:
        # Fallback: feature importance if SHAP fails
        try:
            if hasattr(model, 'feature_importances_'):
                importances = dict(zip(X.columns, model.feature_importances_))
                sorted_imp = sorted(
                    importances.items(), key=lambda x: x[1], reverse=True
                )
                return {
                    "top_factors": [
                        {"feature": feat, "importance": round(float(val), 4)}
                        for feat, val in sorted_imp[:top_n]
                    ],
                    "method": "feature_importance_fallback",
                }
        except Exception:
            pass

        return {
            "error": f"Explanation unavailable: {str(e)}",
            "top_factors": [],
        }
