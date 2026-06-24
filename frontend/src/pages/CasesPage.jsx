import React, { useState, useEffect } from 'react';
import { casesAPI } from '../api/client';
import RiskBadge from '../components/RiskBadge';
import StatsCard from '../components/StatsCard';
import ConfirmationModal from '../components/ConfirmationModal';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Clock, ShieldAlert, Target, ChevronDown, ChevronUp, Fingerprint } from 'lucide-react';

const containerVariants = { animate: { transition: { staggerChildren: 0.08 } } };
const itemVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

const rowVariants = {
  initial: { opacity: 0, x: -10 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.3 } },
};

export default function CasesPage() {
  const [cases, setCases] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState(null);
  const [selectedCases, setSelectedCases] = useState(new Set());
  
  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState('success');
  const [modalMessage, setModalMessage] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [casesRes, statsRes] = await Promise.all([
        casesAPI.getPending({ limit: 50 }),
        casesAPI.getStats(),
      ]);
      setCases(casesRes.data.cases);
      setStats(statsRes.data);
    } catch (err) {
      console.error('Failed to load cases:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLabel = async (id, label) => {
    try {
      await casesAPI.label(id, label);
      
      // Remove from list
      setCases((prev) => prev.filter((c) => c._id !== id));
      if (expandedRow === id) setExpandedRow(null);
      
      // Show success modal
      setModalType('success');
      setModalMessage('Case labeled successfully');
      setModalOpen(true);
      
      // Reload stats in background
      casesAPI.getStats().then(res => setStats(res.data)).catch(() => {});
      
    } catch (err) {
      console.error('Failed to label:', err);
      setModalType('error');
      setModalMessage('Failed to label case');
      setModalOpen(true);
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedCases(new Set(cases.map(c => c._id)));
    } else {
      setSelectedCases(new Set());
    }
  };

  const handleSelect = (id) => {
    const newSet = new Set(selectedCases);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedCases(newSet);
  };

  return (
    <div className="main-content">
      <motion.div variants={containerVariants} initial="initial" animate="animate">
        <div className="page-header">
          <h1>Anomalies Detected</h1>
          <motion.p variants={itemVariants}>Review flagged provider details and correct anomalies</motion.p>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatsCard icon={ShieldAlert} label="Total Cases" value={String(stats.totalCases || 0)} color="indigo" delay={0} />
            <StatsCard icon={XCircle} label="True Positives" value={String(stats.truePositives || 0)} color="red" delay={100} />
            <StatsCard icon={CheckCircle} label="False Positives" value={String(stats.falsePositives || 0)} color="emerald" delay={200} />
            <StatsCard icon={Target} label="Precision" value={stats.precision ? `${(stats.precision * 100).toFixed(1)}%` : 'N/A'} color="purple" delay={300} />
          </div>
        )}

        {/* Case Table Area */}
        <motion.div className="glass-card overflow-hidden" variants={itemVariants}>
          
          <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)] bg-[var(--bg-elevated)]/50">
            <div className="flex items-center gap-3">
              <input 
                type="checkbox" 
                className="w-4 h-4 rounded border-[var(--border-color)] text-indigo-500 focus:ring-indigo-500 bg-[var(--bg-primary)]"
                checked={cases.length > 0 && selectedCases.size === cases.length}
                onChange={handleSelectAll}
              />
              <span className="font-semibold text-[var(--text-primary)]">Anomalies Detected</span>
            </div>
            <button 
              className="btn-ghost py-1.5 px-3 text-xs border border-blue-200 text-blue-600 rounded-full hover:bg-blue-50"
              disabled={selectedCases.size === 0}
            >
              Mark All Reviewed
            </button>
          </div>

          {loading ? (
            <div className="p-12 text-center text-[var(--text-muted)]">
              <span className="inline-block w-5 h-5 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mr-2" />
              Loading cases...
            </div>
          ) : cases.length === 0 ? (
            <motion.div className="text-center" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 1rem' }} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
              <CheckCircle size={48} className="text-emerald-400" style={{ marginBottom: '0.75rem' }} />
              <p className="text-lg font-medium text-[var(--text-primary)]">All clear!</p>
              <p className="text-sm text-[var(--text-muted)] mt-1">No cases pending review.</p>
            </motion.div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table w-full text-left min-w-[800px]">
                <thead className="text-[10px] font-bold text-[var(--text-muted)] border-b-2 border-[var(--border-color)]" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                  <tr>
                    <th className="w-12 px-4 py-3"></th>
                    <th className="px-4 py-3">Provider Detail</th>
                    <th className="px-4 py-3">Provider Address</th>
                    <th className="px-4 py-3">Network</th>
                    <th className="px-4 py-3">Network Address</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Anomaly Score</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  <AnimatePresence>
                    {cases.map((txn, i) => {
                      const isExpanded = expandedRow === txn._id;
                      const topFactors = txn.shapValues 
                        ? Object.entries(txn.shapValues).sort((a, b) => b[1] - a[1]).slice(0, 3)
                        : [];
                        
                      return (
                        <React.Fragment key={txn._id}>
                        <motion.tr 
                          layout
                          variants={rowVariants}
                          initial="initial"
                          animate="animate"
                          exit="exit"
                          className="group transition-colors border-b border-[var(--border-color)]"
                          whileHover={{ backgroundColor: 'var(--bg-elevated)' }}
                        >
                          <td className="px-4 py-3 align-top pt-4">
                            <input 
                              type="checkbox"
                              checked={selectedCases.has(txn._id)}
                              onChange={() => handleSelect(txn._id)}
                              className="w-4 h-4 rounded border-[var(--border-color)] text-indigo-500 focus:ring-indigo-500 bg-[var(--bg-primary)]"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-semibold text-[var(--text-primary)]">
                              {txn.first || 'Unknown'} {txn.last || 'User'}
                            </p>
                            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                              {txn.merchant} · <span className="font-mono">•••• {txn.cardNum ? txn.cardNum.slice(-4) : '----'}</span>
                            </p>
                          </td>
                          <td className="px-4 py-3 text-sm text-[var(--text-secondary)] max-w-xs truncate">
                            {txn.street || '2810 N Airport Fwy, Irving, Texas, 75062'}
                          </td>
                          <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                            NPI Network
                          </td>
                          <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                            NPI Network, Irving
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold">
                            {txn.fraudScore > 0.5 ? (
                              <span className="text-red-500">Critical</span>
                            ) : (
                              <span className="text-green-500">Completed</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm font-mono font-bold text-[var(--accent-primary)]">
                            {txn.fraudScore ? `${(txn.fraudScore * 100).toFixed(1)}%` : '0.0%'}
                          </td>
                          <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                            {txn.transDateTime ? new Date(txn.transDateTime).toLocaleDateString() : '03/10/2022'}
                          </td>
                          <td className="px-4 py-3 text-center cursor-pointer" onClick={() => setExpandedRow(isExpanded ? null : txn._id)}>
                            <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center hover:bg-blue-600 transition-colors mx-auto">
                              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </div>
                          </td>
                        </motion.tr>
                        
                        {/* Expanded Row Content */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.tr
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="bg-[var(--bg-secondary)]"
                            >
                              <td colSpan="8" className="px-4 pb-6 pt-2 border-b border-[var(--border-color)]">
                                <div className="ml-12 mr-4 flex flex-col">
                                  <p className="text-sm font-semibold mb-4">Anomaly Detected: inconsistencies in Provider Address</p>
                                  <div className="grid grid-cols-2 gap-8 mb-4">
                                    <div>
                                      <label className="block text-xs font-semibold text-gray-500 mb-1 text-red-500">Provider Name <span className="text-red-500">*</span></label>
                                      <input type="text" defaultValue={txn.merchant} className="w-full border border-gray-200 rounded p-2 text-sm" />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-semibold text-gray-500 mb-1">Feedback</label>
                                      <textarea rows="3" className="w-full border border-gray-200 rounded p-2 text-sm" placeholder="Details..."></textarea>
                                    </div>
                                    <div className="-mt-16">
                                      <label className="block text-xs font-semibold text-gray-500 mb-1">Address <span className="text-red-500">*</span></label>
                                      <input type="text" defaultValue="2810 N Airport Fwy" className="w-full border border-gray-200 rounded p-2 text-sm" />
                                    </div>
                                  </div>
                                  <div className="flex justify-end">
                                    <button
                                      onClick={() => handleLabel(txn._id, 'true_positive')}
                                      className="border-2 border-blue-500 text-blue-500 rounded-full px-6 py-1.5 text-sm font-semibold hover:bg-blue-50"
                                    >
                                      Correct Anomalies
                                    </button>
                                  </div>
                                </div>
                              </td>
                            </motion.tr>
                          )}
                        </AnimatePresence>
                        </React.Fragment>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </motion.div>
      
      {/* Success Modal */}
      <ConfirmationModal 
        isOpen={modalOpen} 
        type={modalType}
        message={modalMessage} 
        onClose={() => setModalOpen(false)} 
      />
    </div>
  );
}
