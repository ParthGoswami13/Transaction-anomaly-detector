"""
FinGuard AI Service — Configuration.

Loads environment variables via python-dotenv.
"""

import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    """Service configuration from environment variables."""

    MODEL_PATH: str = os.environ.get('MODEL_PATH', 'app/models/fraud_model.pkl')
    METADATA_PATH: str = os.environ.get('METADATA_PATH', 'app/models/model_metadata.json')
    MERCHANT_RATES_PATH: str = os.environ.get(
        'MERCHANT_RATES_PATH', 'app/models/fraud_model_merchant_rates.pkl'
    )
    MONGO_URI: str = os.environ.get('MONGO_URI', 'mongodb://localhost:27017/finguard')
    GRAPH_REBUILD_INTERVAL_MINUTES: int = int(
        os.environ.get('GRAPH_REBUILD_INTERVAL_MINUTES', '15')
    )
    LOG_LEVEL: str = os.environ.get('LOG_LEVEL', 'info')


settings = Settings()
