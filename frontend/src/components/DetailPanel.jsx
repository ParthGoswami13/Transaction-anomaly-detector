import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { X, ShieldAlert, AlertTriangle, Fingerprint, MapPin, Hash, User, Clock } from 'lucide-react';
import RiskBadge from './RiskBadge';

const overlayVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 }
};

const panelVariants = {
  initial: { x: '100%', opacity: 0 },
  animate: { 
    x: 0, 
    opacity: 1, 
    transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] } 
  },
  exit: { 
    x: '100%', 
    opacity: 0, 
    transition: { duration: 0.25 } 
  },
};

const itemVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3 } }
};

export default function DetailPanel({ isOpen, transaction, onClose }) {
  if (!transaction) return null;

  const topFactors = transaction.shapValues 
    ? Object.entries(transaction.shapValues).sort((a, b) => b[1] - a[1]).slice(0, 3)
    : [];

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <motion.div
            variants={overlayVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            variants={panelVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="relative w-full max-w-md h-full bg-[var(--bg-card)] border-l border-[rgba(99,102,241,0.2)] shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--border-color)] bg-[var(--bg-elevated)]/50" style={{ padding: '1.25rem 1.5rem' }}>
              <h2 className="text-lg font-bold text-[var(--text-primary)]">Transaction Details</h2>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-[var(--bg-primary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Primary Info */}
              <motion.div variants={itemVariants} initial="initial" animate="animate" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <p className="text-3xl font-bold text-[var(--text-primary)] m-0 leading-none">
                    ${parseFloat(transaction.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-sm font-medium text-[var(--text-secondary)] m-0">{transaction.merchant || 'Unknown Merchant'}</p>
                </div>
                <RiskBadge score={transaction.fraudScore} />
              </motion.div>

              {/* Fraud Flags */}
              {transaction.fraudFlags && transaction.fraudFlags.length > 0 && (
                <motion.div variants={itemVariants} initial="initial" animate="animate" className="bg-red-500/10 border border-red-500/20 rounded-xl" style={{ padding: '1rem' }}>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-red-400" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <AlertTriangle size={14} /> <span>Detected Flags</span>
                  </h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', paddingLeft: '22px' }}>
                    {transaction.fraudFlags.map((flag, idx) => (
                      <span key={idx} className="bg-red-50 text-red-700 text-xs font-semibold border border-red-200" style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 10px', borderRadius: '6px', whiteSpace: 'nowrap' }}>
                        {flag.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* SHAP Factors */}
              {topFactors.length > 0 && (
                <motion.div variants={itemVariants} initial="initial" animate="animate" className="glass-card rounded-xl" style={{ padding: '1rem' }}>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-indigo-400" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <ShieldAlert size={14} /> <span>AI Risk Factors</span>
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingLeft: '22px' }}>
                    {topFactors.map(([feature, value], idx) => (
                      <div key={idx}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-[var(--text-secondary)]">{feature}</span>
                          <span className="font-semibold text-[var(--text-primary)]">{(value * 100).toFixed(1)}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-[var(--bg-primary)] rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                            style={{ width: `${Math.min(Math.abs(value * 100), 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Transaction Metadata */}
              <motion.div variants={itemVariants} initial="initial" animate="animate" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingTop: '0.5rem' }}>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] border-b border-[var(--border-color)] pb-2">
                  Metadata
                </h4>
                
                <div className="w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm mt-2">
                  <table className="w-full text-left border-collapse">
                    <tbody>
                      <tr className="hover:bg-gray-50/50 transition-colors">
                        <td className="table-cell border-b border-gray-100 bg-gray-50/30 w-1/3">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            <Hash size={14} className="text-indigo-400" /> Transaction ID
                          </div>
                        </td>
                        <td className="table-cell border-b border-gray-100 font-medium text-gray-800 break-all text-xs">
                          {transaction._id}
                        </td>
                      </tr>
                      <tr className="hover:bg-gray-50/50 transition-colors">
                        <td className="table-cell border-b border-gray-100 bg-gray-50/30">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            <Clock size={14} className="text-indigo-400" /> Date & Time
                          </div>
                        </td>
                        <td className="table-cell border-b border-gray-100 text-gray-700 font-medium text-xs">
                          {transaction.transDateTime ? new Date(transaction.transDateTime).toLocaleString() : 'N/A'}
                        </td>
                      </tr>
                      <tr className="hover:bg-gray-50/50 transition-colors">
                        <td className="table-cell border-b border-gray-100 bg-gray-50/30">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            <User size={14} className="text-indigo-400" /> Cardholder
                          </div>
                        </td>
                        <td className="table-cell border-b border-gray-100 text-gray-700 font-medium text-xs">
                          {transaction.first || transaction.last ? `${transaction.first || ''} ${transaction.last || ''}`.trim() : 'Unknown'}
                        </td>
                      </tr>
                      <tr className="hover:bg-gray-50/50 transition-colors">
                        <td className="table-cell border-b border-gray-100 bg-gray-50/30">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            <Fingerprint size={14} className="text-indigo-400" /> Card Number
                          </div>
                        </td>
                        <td className="table-cell border-b border-gray-100 text-gray-700 font-mono font-semibold text-xs">
                          •••• {transaction.cardNum ? transaction.cardNum.slice(-4) : '----'}
                        </td>
                      </tr>
                      <tr className="hover:bg-gray-50/50 transition-colors">
                        <td className="table-cell bg-gray-50/30">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            <MapPin size={14} className="text-indigo-400" /> Location
                          </div>
                        </td>
                        <td className="table-cell text-gray-700 font-medium text-xs">
                          {[transaction.city, transaction.state].filter(Boolean).join(', ') || 'Unknown'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </motion.div>
            </div>
            
            {/* Footer Actions (Optional, depending on user roles but good to have a close button) */}
            <div className="p-4 border-t border-[var(--border-color)] bg-[var(--bg-elevated)]/50">
              <button 
                onClick={onClose}
                className="w-full btn-ghost justify-center py-2"
              >
                Close Details
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
