import { useState, useEffect } from 'react';
import { transactionsAPI } from '../api/client';
import FraudGraphView from '../components/FraudGraphView';
import ModelComparisonChart from '../components/ModelComparisonChart';
import axios from 'axios';
import { Network, BarChart3, RefreshCw } from 'lucide-react';

export default function FraudGraphPage() {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [comparisonData, setComparisonData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGraphData();
    loadModelComparison();
  }, []);

  const loadGraphData = async () => {
    setLoading(true);
    try {
      // Fetch flagged transactions to build a graph
      const { data } = await transactionsAPI.getFlagged(0.3);
      const txns = data.transactions || [];

      // Build nodes & links from transactions
      const nodeMap = new Map();
      const links = [];

      txns.forEach((txn) => {
        const senderId = txn.cardNum || 'unknown';
        const receiverId = txn.merchant || 'unknown';

        if (!nodeMap.has(senderId)) {
          nodeMap.set(senderId, {
            id: senderId,
            group: 'account',
            riskScore: txn.fraudScore || 0,
          });
        } else {
          // Update risk to max seen
          const existing = nodeMap.get(senderId);
          existing.riskScore = Math.max(existing.riskScore, txn.fraudScore || 0);
        }

        if (!nodeMap.has(receiverId)) {
          nodeMap.set(receiverId, {
            id: receiverId,
            group: 'merchant',
            riskScore: 0,
          });
        }

        links.push({
          source: senderId,
          target: receiverId,
          value: txn.amount || 1,
        });
      });

      setGraphData({
        nodes: Array.from(nodeMap.values()),
        links,
      });
    } catch (err) {
      console.error('Failed to load graph data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadModelComparison = async () => {
    try {
      const AI_URL = import.meta.env.VITE_AI_SERVICE_URL || 'http://localhost:8000';
      const { data } = await axios.get(`${AI_URL}/model/comparison`);
      if (data.available) {
        setComparisonData(data.results);
      }
    } catch (err) {
      console.log('Model comparison not available:', err.message);
    }
  };

  return (
    <div className="main-content">
      <div className="flex items-center justify-between mb-6">
        <div className="page-header mb-0">
          <h1>Fraud Network Graph</h1>
          <p>Visualize transaction relationships and fraud rings</p>
        </div>
        <button className="btn-ghost" onClick={loadGraphData}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Graph */}
      <div className="glass-card p-5 mb-6 fade-in-up">
        <div className="flex items-center gap-2 mb-4">
          <Network size={16} className="text-indigo-400" />
          <h3 className="font-semibold text-sm">Transaction Network</h3>
          <span className="text-xs text-[var(--text-muted)] ml-auto">
            {graphData.nodes.length} nodes · {graphData.links.length} edges
          </span>
        </div>
        {loading ? (
          <div className="h-[500px] flex items-center justify-center text-[var(--text-muted)]">
            Building graph...
          </div>
        ) : (
          <FraudGraphView nodes={graphData.nodes} links={graphData.links} />
        )}
        {/* Legend */}
        <div className="flex gap-6 mt-4 text-xs text-[var(--text-muted)]">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-indigo-500" />
            Account (Low Risk)
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-500" />
            Suspicious
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500" />
            High Risk
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-purple-500" />
            Merchant
          </div>
        </div>
      </div>

      {/* Model Comparison */}
      <div className="glass-card p-5 fade-in-up" style={{ animationDelay: '200ms' }}>
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 size={16} className="text-purple-400" />
          <h3 className="font-semibold text-sm">Model Comparison (PR-AUC)</h3>
        </div>
        <ModelComparisonChart results={comparisonData} />
      </div>
    </div>
  );
}
