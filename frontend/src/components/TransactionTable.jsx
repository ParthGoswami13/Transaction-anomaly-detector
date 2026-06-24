import { motion } from 'framer-motion';
import RiskBadge from './RiskBadge';

const rowVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

function formatTxnDate(txn) {
  const source = txn.transDateTime || txn.createdAt || txn.updatedAt;
  if (!source) return '—';

  const date = new Date(source);
  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getTxnFlags(txn) {
  const flags = Array.isArray(txn.fraudFlags) ? txn.fraudFlags.filter(Boolean) : [];

  if (flags.length > 0) {
    return flags.map((flag) => flag.replace(/_/g, ' '));
  }

  if (txn.isSmurfing) {
    return [txn.smurfingPattern ? `smurfing: ${txn.smurfingPattern.replace(/_/g, ' ')}` : 'smurfing'];
  }

  if (txn.analystLabel && txn.analystLabel !== 'unreviewed') {
    return [txn.analystLabel.replace(/_/g, ' ')];
  }

  if (txn.fraudScore != null && txn.fraudScore >= 0.7) {
    return ['high risk'];
  }

  return ['no flags'];
}

export default function TransactionTable({ transactions, onRowClick, showLabel = false }) {
  if (!transactions || transactions.length === 0) {
    return (
      <div className="text-center py-12 text-[var(--text-muted)]">
        <p className="text-lg font-medium">No transactions found</p>
        <p className="text-sm mt-1">Transactions will appear here once created.</p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
      <table className="w-full text-left border-collapse">
        <thead className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 font-semibold">
          <tr>
            <th className="table-cell">Card / ID</th>
            <th className="table-cell">Merchant</th>
            <th className="table-cell">Amount</th>
            <th className="table-cell">Date</th>
            <th className="table-cell">Risk Score</th>
            <th className="table-cell">Flags</th>
            {showLabel && <th className="table-cell">Label</th>}
          </tr>
        </thead>
        <tbody>
          {transactions.map((txn, i) => (
            <motion.tr
              key={txn._id || i}
              variants={rowVariants}
              initial="initial"
              animate="animate"
              transition={{ delay: i * 0.04 }}
              onClick={() => onRowClick?.(txn)}
              className={onRowClick ? 'cursor-pointer' : ''}
              style={{ transformOrigin: 'left center' }}
              whileHover={{
                scale: 1.01,
                backgroundColor: 'var(--bg-elevated)',
                transition: { duration: 0.15 },
              }}
            >
              <td className="table-cell border-b border-gray-100 font-mono text-xs whitespace-nowrap text-gray-600">
                {txn.cardNum
                  ? `•••• ${txn.cardNum.slice(-4)}`
                  : '—'}
              </td>
              <td className="table-cell border-b border-gray-100 max-w-[120px] truncate font-medium text-gray-800">{txn.merchant || '—'}</td>
              <td className="table-cell border-b border-gray-100 font-semibold text-gray-800 whitespace-nowrap">
                ${parseFloat(txn.amount || 0).toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                })}
              </td>
              <td className="table-cell border-b border-gray-100 text-xs whitespace-nowrap text-gray-500">
                {formatTxnDate(txn)}
              </td>
              <td className="table-cell border-b border-gray-100">
                <div className="flex flex-col gap-1">
                  <RiskBadge score={txn.fraudScore} />
                  {txn.fraudScore != null && (
                    <div className="risk-bar-track">
                      <motion.div
                        className="risk-bar-fill"
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(txn.fraudScore * 100, 100)}%` }}
                        transition={{ duration: 0.7, ease: 'easeOut', delay: i * 0.03 }}
                        style={{
                          background: txn.fraudScore >= 0.7
                            ? 'linear-gradient(90deg, #ef4444, #f87171)'
                            : txn.fraudScore >= 0.4
                            ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
                            : 'linear-gradient(90deg, #22c55e, #4ade80)',
                        }}
                      />
                    </div>
                  )}
                </div>
              </td>
              <td className="table-cell border-b border-gray-100">
                <div className="flex flex-wrap gap-1 min-w-[80px] max-w-full">
                  {getTxnFlags(txn).map((flag, j) => (
                    <span
                      key={j}
                      className="text-[0.65rem] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200 whitespace-nowrap"
                    >
                      {flag}
                    </span>
                  ))}
                </div>
              </td>
              {showLabel && (
                <td className="table-cell border-b border-gray-100">
                  <span
                    className={`badge ${
                      txn.analystLabel === 'true_positive'
                        ? 'badge-danger'
                        : txn.analystLabel === 'false_positive'
                        ? 'badge-success'
                        : 'badge-info'
                    }`}
                  >
                    {txn.analystLabel?.replace(/_/g, ' ') || 'unreviewed'}
                  </span>
                </td>
              )}
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
