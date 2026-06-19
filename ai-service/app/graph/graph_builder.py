"""
FinGuard AI Service — Transaction Graph Builder.

Builds a directed graph from sender→receiver transfer data
using NetworkX. Edge weights aggregate total amount and transaction count.
"""

import networkx as nx
import pandas as pd


def build_transaction_graph(transfers_df: pd.DataFrame) -> nx.DiGraph:
    """
    Build a directed transaction graph from transfer data.

    Args:
        transfers_df: DataFrame with columns:
            sender_account, receiver_account, amount, timestamp

    Returns:
        NetworkX DiGraph with aggregated edge weights and counts.
    """
    G = nx.DiGraph()

    for _, row in transfers_df.iterrows():
        sender = str(row['sender_account'])
        receiver = str(row['receiver_account'])
        amount = float(row['amount'])

        if G.has_edge(sender, receiver):
            G[sender][receiver]['weight'] += amount
            G[sender][receiver]['count'] += 1
        else:
            G.add_edge(sender, receiver, weight=amount, count=1)

    return G
