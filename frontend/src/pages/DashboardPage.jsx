import { useState, useEffect } from 'react';
import { transactionsAPI } from '../api/client';
import StatsCard from '../components/StatsCard';
import TransactionTable from '../components/TransactionTable';
import {
  Activity,
  AlertTriangle,
  ShieldAlert,
  ClipboardList,
  TrendingUp,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const PIE_COLORS = ['#22c55e', '#f59e0b', '#ef4444', '#6366f1'];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload) {
    return (
      <div className="glass-card p-3 text-xs">
        <p className="font-semibold text-[var(--text-primary)]">{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }}>
            {p.name}: {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const { data } = await transactionsAPI.getStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="main-content">
        <div className="page-header">
          <h1>Dashboard</h1>
          <p>Loading analytics...</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass-card p-5 h-24 shimmer" />
          ))}
        </div>
      </div>
    );
  }

  const riskPieData = stats?.riskDistribution?.map((bucket, i) => {
    const labels = ['Low (0–0.3)', 'Medium (0.3–0.5)', 'High (0.5–0.7)', 'Critical (0.7+)'];
    return {
      name: labels[i] || `Bucket ${i}`,
      value: bucket.count,
    };
  }) || [];

  return (
    <div className="main-content">
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Real-time fraud monitoring overview</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard
          icon={Activity}
          label="Total Transactions"
          value={stats?.totalTransactions?.toLocaleString() || '0'}
          color="indigo"
          delay={0}
        />
        <StatsCard
          icon={AlertTriangle}
          label="Flagged Fraud"
          value={stats?.flaggedFraud?.toLocaleString() || '0'}
          subtitle={stats?.totalTransactions ? `${((stats.flaggedFraud / stats.totalTransactions) * 100).toFixed(1)}% of total` : null}
          color="red"
          delay={100}
        />
        <StatsCard
          icon={ShieldAlert}
          label="Smurfing Detected"
          value={stats?.smurfingDetected?.toLocaleString() || '0'}
          color="amber"
          delay={200}
        />
        <StatsCard
          icon={ClipboardList}
          label="Pending Review"
          value={stats?.pendingReview?.toLocaleString() || '0'}
          subtitle="Needs analyst attention"
          color="purple"
          delay={300}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Daily Volume Chart */}
        <div className="glass-card p-5 lg:col-span-2 fade-in-up" style={{ animationDelay: '400ms' }}>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={16} className="text-indigo-400" />
            <h3 className="font-semibold text-sm">Transaction Volume (7 days)</h3>
          </div>
          {stats?.dailyVolume?.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={stats.dailyVolume}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="_id"
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  tickFormatter={(v) => v?.slice(5)}
                />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fill="url(#colorCount)"
                  name="Transactions"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-[var(--text-muted)] text-sm">
              No volume data yet
            </div>
          )}
        </div>

        {/* Risk Distribution Pie */}
        <div className="glass-card p-5 fade-in-up" style={{ animationDelay: '500ms' }}>
          <h3 className="font-semibold text-sm mb-4">Risk Distribution</h3>
          {riskPieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={riskPieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  strokeWidth={0}
                >
                  {riskPieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) =>
                    active && payload?.[0] ? (
                      <div className="glass-card p-2 text-xs">
                        <span className="text-[var(--text-primary)]">{payload[0].name}: </span>
                        <span className="font-bold">{payload[0].value}</span>
                      </div>
                    ) : null
                  }
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-[var(--text-muted)] text-sm">
              No risk data yet
            </div>
          )}
          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-2 justify-center">
            {riskPieData.map((d, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                />
                {d.name}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="glass-card p-5 fade-in-up" style={{ animationDelay: '600ms' }}>
        <h3 className="font-semibold text-sm mb-4">Recent Transactions</h3>
        <TransactionTable transactions={stats?.recentTransactions || []} />
      </div>
    </div>
  );
}
