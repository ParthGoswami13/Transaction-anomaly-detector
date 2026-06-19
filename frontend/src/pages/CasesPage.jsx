import { useState, useEffect } from 'react';
import { casesAPI } from '../api/client';
import RiskBadge from '../components/RiskBadge';
import { CheckCircle, XCircle, Clock, BarChart3 } from 'lucide-react';

export default function CasesPage() {
  const [cases, setCases] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [labeling, setLabeling] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

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
    setLabeling(id);
    try {
      await casesAPI.label(id, label);
      setCases((prev) => prev.filter((c) => c._id !== id));
      loadData();
    } catch (err) {
      console.error('Failed to label:', err);
    } finally {
      setLabeling(null);
    }
  };

  return (
    <div className="main-content">
      <div className="page-header">
        <h1>Case Review</h1>
        <p>Review flagged transactions and provide analyst feedback</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="glass-card p-4 fade-in-up">
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Total Cases</p>
            <p className="text-xl font-bold mt-1">{stats.totalCases}</p>
          </div>
          <div className="glass-card p-4 fade-in-up" style={{ animationDelay: '100ms' }}>
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">True Positives</p>
            <p className="text-xl font-bold mt-1 text-red-400">{stats.truePositives}</p>
          </div>
          <div className="glass-card p-4 fade-in-up" style={{ animationDelay: '200ms' }}>
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">False Positives</p>
            <p className="text-xl font-bold mt-1 text-emerald-400">{stats.falsePositives}</p>
          </div>
          <div className="glass-card p-4 fade-in-up" style={{ animationDelay: '300ms' }}>
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Precision</p>
            <p className="text-xl font-bold mt-1 text-indigo-400">
              {stats.precision ? `${(stats.precision * 100).toFixed(1)}%` : 'N/A'}
            </p>
          </div>
        </div>
      )}

      {/* Cases Queue */}
      <div className="glass-card fade-in-up" style={{ animationDelay: '400ms' }}>
        <div className="flex items-center gap-2 p-4 border-b border-[var(--border-color)]">
          <Clock size={16} className="text-amber-400" />
          <h3 className="font-semibold text-sm">Pending Review ({cases.length})</h3>
        </div>

        {loading ? (
          <div className="p-12 text-center text-[var(--text-muted)]">Loading cases...</div>
        ) : cases.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle size={48} className="mx-auto text-emerald-400 mb-3" />
            <p className="text-lg font-medium text-[var(--text-primary)]">All clear!</p>
            <p className="text-sm text-[var(--text-muted)] mt-1">No cases pending review.</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-color)]">
            {cases.map((txn) => (
              <div
                key={txn._id}
                className="p-4 flex items-center gap-4 hover:bg-[var(--bg-card-hover)] transition-colors"
              >
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs text-[var(--text-muted)]">
                      {txn.cardNum ? `•••• ${txn.cardNum.slice(-4)}` : '—'}
                    </span>
                    <span className="text-[var(--text-muted)]">→</span>
                    <span className="text-sm font-medium truncate">{txn.merchant}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
                    <span className="font-semibold text-[var(--text-primary)]">
                      ${parseFloat(txn.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                    <span>
                      {txn.transDateTime
                        ? new Date(txn.transDateTime).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '—'}
                    </span>
                    {txn.fraudFlags?.map((flag, i) => (
                      <span key={i} className="px-1.5 py-0.5 rounded bg-[var(--bg-elevated)]">
                        {flag.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Score */}
                <RiskBadge score={txn.fraudScore} />

                {/* Score value */}
                <span className="text-sm font-bold w-16 text-right text-[var(--text-primary)]">
                  {txn.fraudScore != null ? `${(txn.fraudScore * 100).toFixed(0)}%` : '—'}
                </span>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    className="btn-danger text-xs py-1.5 px-3 flex items-center gap-1"
                    disabled={labeling === txn._id}
                    onClick={() => handleLabel(txn._id, 'true_positive')}
                  >
                    <XCircle size={14} /> Fraud
                  </button>
                  <button
                    className="btn-success text-xs py-1.5 px-3 flex items-center gap-1"
                    disabled={labeling === txn._id}
                    onClick={() => handleLabel(txn._id, 'false_positive')}
                  >
                    <CheckCircle size={14} /> Legit
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
