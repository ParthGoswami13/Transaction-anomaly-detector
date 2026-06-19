"""
Tests for FinGuard AI Service — Graph Detection.
"""

import networkx as nx
from app.graph.graph_detection import (
    detect_fan_pattern, detect_layering_cycles,
    detect_fraud_ring, detect_smurfing, compute_centrality_features
)


def test_fan_in_detected():
    """Fan-in: many senders → one receiver should be flagged."""
    G = nx.DiGraph()
    for i in range(15):
        G.add_edge(f'sender_{i}', 'mule_account')
    result = detect_fan_pattern(G, 'mule_account')
    assert result['pattern'] == 'fan_in'


def test_fan_out_detected():
    """Fan-out: one sender → many receivers should be flagged."""
    G = nx.DiGraph()
    for i in range(15):
        G.add_edge('dispersal_account', f'receiver_{i}')
    result = detect_fan_pattern(G, 'dispersal_account')
    assert result['pattern'] == 'fan_out'


def test_no_fan_pattern():
    """Normal account with few connections should not be flagged."""
    G = nx.DiGraph()
    G.add_edge('A', 'B')
    G.add_edge('A', 'C')
    result = detect_fan_pattern(G, 'A')
    assert result['pattern'] is None


def test_cycle_detected():
    """A → B → C → A should be detected as a layering cycle."""
    G = nx.DiGraph()
    G.add_edges_from([('A', 'B'), ('B', 'C'), ('C', 'A')])
    result = detect_layering_cycles(G, 'A')
    assert result['pattern'] == 'layering_cycle'


def test_no_cycle():
    """A linear chain should not be detected as a cycle."""
    G = nx.DiGraph()
    G.add_edges_from([('A', 'B'), ('B', 'C')])
    result = detect_layering_cycles(G, 'A')
    assert result['pattern'] is None


def test_unknown_account_no_crash():
    """Querying an account not in the graph should return clean result."""
    G = nx.DiGraph()
    G.add_edge('A', 'B')
    result = detect_smurfing(G, 'nonexistent')
    assert result['is_smurfing'] is False


def test_centrality_features_computed():
    """Centrality features should return values for all nodes in the graph."""
    G = nx.DiGraph()
    G.add_edges_from([('A', 'B'), ('B', 'C'), ('C', 'A')])
    features = compute_centrality_features(G)
    assert 'A' in features
    assert 'degree_centrality' in features['A']
    assert 'pagerank' in features['A']
    assert 'clustering_coef' in features['A']
