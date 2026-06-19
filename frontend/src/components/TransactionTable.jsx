import RiskBadge from './RiskBadge';

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
    <div className="overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            <th>Card / ID</th>
            <th>Merchant</th>
            <th>Amount</th>
            <th>Date</th>
            <th>Risk Score</th>
            <th>Flags</th>
            {showLabel && <th>Label</th>}
          </tr>
        </thead>
        <tbody>
          {transactions.map((txn, i) => (
            <tr
              key={txn._id || i}
              onClick={() => onRowClick?.(txn)}
              className={onRowClick ? 'cursor-pointer' : ''}
            >
              <td className="font-mono text-xs">
                {txn.cardNum
                  ? `•••• ${txn.cardNum.slice(-4)}`
                  : '—'}
              </td>
              <td className="max-w-[180px] truncate">{txn.merchant || '—'}</td>
              <td className="font-semibold text-[var(--text-primary)]">
                ${parseFloat(txn.amount || 0).toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                })}
              </td>
              <td className="text-xs">
                {txn.transDateTime
                  ? new Date(txn.transDateTime).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '—'}
              </td>
              <td>
                <RiskBadge score={txn.fraudScore} />
              </td>
              <td>
                <div className="flex flex-wrap gap-1">
                  {txn.fraudFlags?.length > 0
                    ? txn.fraudFlags.map((flag, j) => (
                        <span
                          key={j}
                          className="text-[0.65rem] px-1.5 py-0.5 rounded bg-[var(--bg-elevated)] text-[var(--text-muted)]"
                        >
                          {flag.replace(/_/g, ' ')}
                        </span>
                      ))
                    : <span className="text-[var(--text-muted)]">—</span>}
                </div>
              </td>
              {showLabel && (
                <td>
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
