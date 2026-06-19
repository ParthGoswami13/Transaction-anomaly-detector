"""
FinGuard AI Service — MongoDB Connection (Read-Only).

Provides read-only access to the transfers/transactions collection
owned by the main Express backend. Used for graph rebuilds.
"""

import os
import logging
import pandas as pd
from motor.motor_asyncio import AsyncIOMotorClient

logger = logging.getLogger(__name__)

# Connection — lazy-initialized on first use
_client = None
_db = None


def _get_db():
    """Lazy-initialize the MongoDB client and return the database."""
    global _client, _db
    if _db is None:
        mongo_uri = os.environ.get("MONGO_URI", "mongodb://localhost:27017/finguard")
        _client = AsyncIOMotorClient(mongo_uri)
        _db = _client.get_default_database()
        logger.info(f"MongoDB connection initialized: {mongo_uri}")
    return _db


async def fetch_all_transfers() -> pd.DataFrame:
    """
    Read-only access to the transfers/transactions collection
    owned by the main backend.

    Returns:
        DataFrame with columns: sender_account, receiver_account, amount, timestamp
        Empty DataFrame if no records or connection fails.
    """
    try:
        db = _get_db()
        cursor = db.transfers.find(
            {},
            {
                "sender_account": 1,
                "receiver_account": 1,
                "amount": 1,
                "timestamp": 1,
                "_id": 0,
            }
        )
        records = await cursor.to_list(length=None)

        if not records:
            logger.info("No transfer records found in MongoDB")
            return pd.DataFrame(
                columns=['sender_account', 'receiver_account', 'amount', 'timestamp']
            )

        logger.info(f"Fetched {len(records)} transfer records from MongoDB")
        return pd.DataFrame(records)

    except Exception as e:
        logger.warning(f"Failed to fetch transfers from MongoDB: {e}")
        return pd.DataFrame(
            columns=['sender_account', 'receiver_account', 'amount', 'timestamp']
        )
