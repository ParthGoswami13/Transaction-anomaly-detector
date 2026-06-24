import { useState, useEffect } from 'react';
import { transactionsAPI } from '../api/client';
import FraudGraphView from '../components/FraudGraphView';
import ModelComparisonChart from '../components/ModelComparisonChart';
import { motion } from 'framer-motion';
import axios from 'axios';
import { Network, BarChart3, RefreshCw } from 'lucide-react';

const containerVariants = {
  animate: { transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

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
      const { data } = await transactionsAPI.getFlagged(0.3);
      const txns = data.transactions || [];

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
      <motion.div
        variants={containerVariants}
        initial="initial"
        animate="animate"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="page-header mb-0">
            <h1>Fraud Network Graph</h1>
            <p>Visualize transaction relationships and fraud rings</p>
          </div>
          <motion.button
            className="btn-ghost"
            onClick={loadGraphData}
            whileHover={{ scale: 1.05, rotate: 15 }}
            whileTap={{ scale: 0.95 }}
          >
            <RefreshCw size={14} /> Refresh
          </motion.button>
        </div>

        {/* Graph */}
        <motion.div
          className="glass-card p-5 mb-6"
          variants={itemVariants}
        >
          <div className="flex items-center gap-2 mb-4">
            <Network size={16} className="text-indigo-400" />
            <h3 className="font-semibold text-sm">Transaction Network</h3>
            <span className="text-xs text-[var(--text-muted)] ml-auto">
              {graphData.nodes.length} nodes · {graphData.links.length} edges
            </span>
          </div>
          {loading ? (
            <div className="h-[500px] flex items-center justify-center text-[var(--text-muted)]">
              <span className="inline-block w-5 h-5 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mr-2" />
              Building graph...
            </div>
          ) : (
            <FraudGraphView nodes={graphData.nodes} links={graphData.links} />
          )}
          {/* Legend */}
          <div className="flex flex-wrap gap-6 mt-4 text-xs text-[var(--text-muted)]">
            {[
              { color: '#6366f1', label: 'Account (Low Risk)' },
              { color: '#f59e0b', label: 'Suspicious' },
              { color: '#ef4444', label: 'High Risk' },
              { color: '#8b5cf6', label: 'Merchant' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ background: item.color, boxShadow: `0 0 8px ${item.color}50` }}
                />
                {item.label}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Model Comparison */}
        <motion.div
          className="glass-card p-5"
          variants={itemVariants}
        >
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={16} className="text-purple-400" />
            <h3 className="font-semibold text-sm">Model Comparison (PR-AUC)</h3>
          </div>
          <ModelComparisonChart results={comparisonData} />
        </motion.div>
      </motion.div>
    </div>
  );
}
