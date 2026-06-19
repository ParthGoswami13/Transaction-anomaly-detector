"""
FinGuard AI Service — In-Memory Graph Store & Lifecycle.

Manages the single long-lived transaction graph for this service instance.

Two mechanisms keep the graph current:
  1. Incremental update on every request (cheap, no DB round-trip)
  2. Scheduled full resync from MongoDB (safety net against drift)

The graph is a derived cache — MongoDB is the source of truth.
If the service restarts, it rebuilds from MongoDB rather than
needing anything restored from disk.
"""

import asyncio
import logging
import networkx as nx
from app.graph.graph_builder import build_transaction_graph
from app.db.mongo import fetch_all_transfers

logger = logging.getLogger(__name__)


class GraphStore:
    """Owns the single long-lived transaction graph for this service instance."""

    def __init__(self):
        self.graph = nx.DiGraph()
        self._rebuild_count = 0

    async def rebuild_from_db(self):
        """
        Full graph rebuild from MongoDB.
        Called on startup and periodically via scheduled_rebuild_loop.
        """
        try:
            transfers_df = await fetch_all_transfers()
            self.graph = build_transaction_graph(transfers_df)
            self._rebuild_count += 1
            logger.info(
                f"Graph rebuilt from DB: {self.graph.number_of_nodes()} nodes, "
                f"{self.graph.number_of_edges()} edges (rebuild #{self._rebuild_count})"
            )
        except Exception as e:
            logger.error(f"Graph rebuild failed: {e}")
            # Keep the existing graph rather than crashing

    def add_live_transaction(self, sender: str, receiver: str, amount: float):
        """
        Incremental update — add a single transaction edge.
        Called on every /detect_smurfing request to keep the graph
        current without a DB round-trip.
        """
        if self.graph.has_edge(sender, receiver):
            self.graph[sender][receiver]['weight'] += amount
            self.graph[sender][receiver]['count'] += 1
        else:
            self.graph.add_edge(sender, receiver, weight=amount, count=1)

    def get_stats(self) -> dict:
        """Return basic graph statistics for the health endpoint."""
        return {
            'nodes': self.graph.number_of_nodes(),
            'edges': self.graph.number_of_edges(),
            'rebuild_count': self._rebuild_count,
        }


# Singleton — shared across the service
graph_store = GraphStore()


async def scheduled_rebuild_loop(interval_minutes: int):
    """
    Periodic full resync from MongoDB as a drift safety net.
    Runs as a background asyncio task.
    """
    while True:
        await asyncio.sleep(interval_minutes * 60)
        logger.info(f"Scheduled graph rebuild (every {interval_minutes} min)...")
        await graph_store.rebuild_from_db()
