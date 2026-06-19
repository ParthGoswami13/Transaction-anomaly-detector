"""
FinGuard AI Service — Graph-Based Smurfing / AML Detection.

Three distinct detection algorithms:
  1. Fan-in / fan-out pattern (degree threshold rule)
  2. Fraud ring (Louvain community detection)
  3. Layering cycles (simple_cycles with length bound)

Plus centrality features for graph-enhanced tabular models.
"""

import networkx as nx


# ── Thresholds ──────────────────────────────────────────────
FAN_DEGREE_THRESHOLD = 10
RING_MIN_SIZE = 5
CYCLE_LENGTH_BOUND = 6


def detect_fan_pattern(G: nx.DiGraph, account: str) -> dict:
    """
    Simple degree-threshold rule for fan-in / fan-out structuring.

    Fan-in:  many sources → one destination (money mule collecting)
    Fan-out: one source → many destinations (layering/dispersing)
    """
    if account not in G:
        return {"pattern": None}

    in_deg = G.in_degree(account)
    out_deg = G.out_degree(account)

    if in_deg > FAN_DEGREE_THRESHOLD and out_deg <= 1:
        return {"pattern": "fan_in", "in_degree": in_deg}
    if out_deg > FAN_DEGREE_THRESHOLD and in_deg <= 1:
        return {"pattern": "fan_out", "out_degree": out_deg}

    return {"pattern": None}


def detect_communities(G: nx.DiGraph) -> list:
    """
    Louvain community detection (networkx native).
    Falls back to greedy modularity if Louvain is unavailable.
    """
    undirected = G.to_undirected()
    try:
        return list(nx.community.louvain_communities(undirected, seed=42))
    except AttributeError:
        return list(nx.community.greedy_modularity_communities(undirected))


def detect_fraud_ring(G: nx.DiGraph, account: str) -> dict:
    """
    Detect if an account belongs to a suspiciously tight community
    that could indicate a fraud ring.
    """
    communities = detect_communities(G)
    for community in communities:
        if account in community and len(community) >= RING_MIN_SIZE:
            return {
                "pattern": "fraud_ring",
                "ring_size": len(community),
                "members": list(community)
            }
    return {"pattern": None}


def detect_layering_cycles(G: nx.DiGraph, account: str) -> dict:
    """
    Detects circular fund flows (A → B → C → A), a classic AML
    layering technique where money is moved in circles to obscure origin.
    """
    cycles = [
        c for c in nx.simple_cycles(G, length_bound=CYCLE_LENGTH_BOUND)
        if account in c
    ]
    if cycles:
        return {
            "pattern": "layering_cycle",
            "cycle_count": len(cycles),
            "shortest_cycle": min(cycles, key=len)
        }
    return {"pattern": None}


def compute_centrality_features(G: nx.DiGraph) -> dict:
    """
    Compute per-account graph features for merging into tabular models.

    Returns:
        Dict: {account_id: {'degree_centrality': ..., 'pagerank': ..., 'clustering_coef': ...}}
    """
    degree_centrality = nx.degree_centrality(G)
    pagerank = nx.pagerank(G, weight='weight')
    undirected = G.to_undirected()
    clustering = nx.clustering(undirected)

    return {
        account: {
            'degree_centrality': degree_centrality.get(account, 0),
            'pagerank': pagerank.get(account, 0),
            'clustering_coef': clustering.get(account, 0),
        }
        for account in G.nodes
    }


def detect_smurfing(G: nx.DiGraph, account: str) -> dict:
    """
    Unified smurfing check — runs detection in order from cheapest
    to most expensive algorithm, returning on first match.
    """
    # 1. Fan pattern (O(1) — just degree lookups)
    fan_result = detect_fan_pattern(G, account)
    if fan_result["pattern"]:
        return {"is_smurfing": True, **fan_result}

    # 2. Fraud ring / community (moderate cost)
    ring_result = detect_fraud_ring(G, account)
    if ring_result["pattern"]:
        return {"is_smurfing": True, **ring_result}

    # 3. Layering cycles (most expensive — bounded by CYCLE_LENGTH_BOUND)
    cycle_result = detect_layering_cycles(G, account)
    if cycle_result["pattern"]:
        return {"is_smurfing": True, **cycle_result}

    return {"is_smurfing": False, "pattern": None}
