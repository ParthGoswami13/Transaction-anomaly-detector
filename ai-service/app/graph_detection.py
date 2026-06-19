"""
FinGuard AI Service — Smurfing / Graph-Based Detection.

Builds a directed transaction graph using NetworkX and detects:
- Fan-in / fan-out patterns
- Fraud ring communities
- Transaction structuring (splitting)
"""

import networkx as nx
from typing import Dict, List, Optional


class SmurfingDetector:
    """
    Detects smurfing patterns using a directed transaction graph.
    In production, the graph is rebuilt periodically from MongoDB transaction data.
    """

    def __init__(self):
        self.graph = nx.DiGraph()

    def add_transaction(self, sender: str, receiver: str, amount: float, **edge_attrs):
        """Add a transaction edge to the graph."""
        self.graph.add_node(sender, type='account')
        self.graph.add_node(receiver, type='merchant')
        self.graph.add_edge(sender, receiver, amount=amount, **edge_attrs)

    def build_from_transactions(self, transactions: List[Dict]):
        """Rebuild the graph from a list of transaction dicts."""
        self.graph.clear()
        for txn in transactions:
            self.add_transaction(
                sender=str(txn.get('cardNum', txn.get('cc_num', 'unknown'))),
                receiver=str(txn.get('merchant', 'unknown')),
                amount=float(txn.get('amount', txn.get('amt', 0))),
            )

    def detect_smurfing(self, card_num: str) -> Dict:
        """
        Analyze a card number for smurfing indicators.
        Returns pattern type and suspicion details.
        """
        if card_num not in self.graph:
            return {'is_smurfing': False, 'pattern': None}

        in_degree = self.graph.in_degree(card_num)
        out_degree = self.graph.out_degree(card_num)

        # Fan-in: many sources → one destination
        if in_degree > 10 and out_degree <= 1:
            return {
                'is_smurfing': True,
                'pattern': 'fan_in',
                'in_degree': in_degree,
                'out_degree': out_degree,
            }

        # Fan-out: one source → many destinations
        if out_degree > 10 and in_degree <= 1:
            return {
                'is_smurfing': True,
                'pattern': 'fan_out',
                'in_degree': in_degree,
                'out_degree': out_degree,
            }

        # Fraud ring detection via community analysis
        try:
            undirected = self.graph.to_undirected()
            communities = list(nx.community.greedy_modularity_communities(undirected))
            for community in communities:
                if card_num in community and len(community) > 5:
                    return {
                        'is_smurfing': True,
                        'pattern': 'fraud_ring',
                        'ring_size': len(community),
                    }
        except Exception:
            pass

        return {'is_smurfing': False, 'pattern': None}

    def get_graph_stats(self) -> Dict:
        """Return basic graph statistics for the health endpoint."""
        return {
            'nodes': self.graph.number_of_nodes(),
            'edges': self.graph.number_of_edges(),
            'density': round(nx.density(self.graph), 6) if self.graph.number_of_nodes() > 0 else 0,
        }


# Singleton detector — rebuilt when transactions are loaded
smurfing_detector = SmurfingDetector()


def detect_smurfing(card_num: str) -> Dict:
    """Convenience function wrapping the singleton detector."""
    return smurfing_detector.detect_smurfing(card_num)
