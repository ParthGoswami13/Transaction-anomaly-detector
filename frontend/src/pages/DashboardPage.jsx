import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { transactionsAPI } from '../api/client';
import StatsCard from '../components/StatsCard';
import TransactionTable from '../components/TransactionTable';
import DetailPanel from '../components/DetailPanel';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import {
  Activity,
  AlertTriangle,
  ShieldAlert,
  ClipboardList,
  Search,
  Filter
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, ReferenceLine
} from 'recharts';

const PIE_COLORS = ['#22c55e', '#f59e0b', '#ef4444', '#6366f1'];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload) {
    return (
      <div className="chart-tooltip-glass rounded-xl px-3 py-2">
        <p className="font-semibold text-[var(--text-primary)] text-xs mb-1">{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }} className="text-xs">
            {p.name}: {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const PieTooltip = ({ active, payload }) => {
  if (active && payload?.[0]) {
    return (
      <div className="chart-tooltip-glass rounded-xl px-3 py-2">
        <span className="text-[var(--text-primary)] text-xs">{payload[0].name}: </span>
        <span className="font-bold text-xs">{payload[0].value}</span>
      </div>
    );
  }
  return null;
};

const containerVariants = { animate: { transition: { staggerChildren: 0.08 } } };
const itemVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Overview');
  const [selectedTxn, setSelectedTxn] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const headingRef = useRef(null);
  const navigate = useNavigate();

  const currentUser = (() => {
    try { return JSON.parse(localStorage.getItem('finguard_user')) || {}; } catch { return {}; }
  })();
  const isAdmin = currentUser.role === 'admin';

  useEffect(() => { loadStats(); }, []);

  useEffect(() => {
    if (!loading && headingRef.current) {
      const chars = headingRef.current.querySelectorAll('.heading-char');
      if (chars.length > 0) {
        gsap.from(chars, {
          opacity: 0, y: 30, stagger: 0.03, duration: 0.5, ease: 'power3.out',
        });
      }
    }
  }, [loading]);

  const loadStats = async () => {
    try {
      if (isAdmin) {
        const { data } = await transactionsAPI.getStats();
        setStats(data);
      } else {
        const { data } = await transactionsAPI.list({ limit: 10 });
        setStats({
          totalTransactions: data.pagination.total,
          recentTransactions: data.transactions,
          flaggedFraud: 0, smurfingDetected: 0, pendingReview: 0,
          riskDistribution: [], dailyVolume: [],
        });
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="main-content pt-24">
        <div className="page-header">
          <h1>Dashboard Overview</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => <div key={i} className="glass-card p-5 h-28 shimmer" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="glass-card p-5 h-96 shimmer" />
          <div className="glass-card p-5 h-96 shimmer" />
        </div>
      </div>
    );
  }

  const riskPieData = stats?.riskDistribution?.map((bucket, i) => {
    const labels = ['Low (0–0.3)', 'Medium (0.3–0.5)', 'High (0.5–0.7)', 'Critical (0.7+)'];
    return { name: labels[i] || `Bucket ${i}`, value: bucket.count };
  }) || [];

  const headingText = 'Dashboard Overview';
  const headingChars = headingText.split('').map((char, i) => (
    <span key={i} className="heading-char inline-block" style={{ display: 'inline-block' }}>
      {char === ' ' ? '\u00A0' : char}
    </span>
  ));

  const filteredTxns = (stats?.recentTransactions || []).filter(t => 
    t.merchant?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (t.cardNum && t.cardNum.includes(searchTerm))
  );

  return (
    <div className="main-content">
      <motion.div
        variants={containerVariants}
        initial="initial"
        animate="animate"
        style={{ width: '100%', maxWidth: '80rem', margin: '0 auto' }}
      >

        {/* ── Header row ── */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', alignItems: 'center',
          justifyContent: 'space-between', gap: '1rem',
          background: 'var(--bg-secondary)', padding: '1.25rem 1.5rem',
          borderRadius: '0.75rem', border: '1px solid var(--border-color)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          marginBottom: '2rem', position: 'relative', zIndex: 20
        }}>
          <div ref={headingRef} style={{ display: 'flex', alignItems: 'center' }}>
            <h1 style={{ fontSize: '1.875rem', fontWeight: 800, margin: 0, padding: 0, color: 'var(--text-primary)', lineHeight: 1.2 }}>
              <span className="heading-chars">{headingChars}</span>
            </h1>
          </div>
          <div style={{ position: 'relative', flex: '0 0 280px', maxWidth: '280px' }}>
            <Search style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} size={16} />
            <input
              type="text"
              placeholder="Search provider/merchant..."
              className="input-field"
              style={{ paddingLeft: '2.5rem', background: 'var(--bg-elevated)' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* ── Stats Cards ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem'
        }}>
          <StatsCard icon={Activity} label="Total Transactions" value={stats?.totalTransactions?.toLocaleString() || '0'} color="indigo" delay={0} onActionClick={() => navigate('/transactions')} />
          <StatsCard icon={AlertTriangle} label="Flagged Fraud" value={stats?.flaggedFraud?.toLocaleString() || '0'} subtitle={stats?.totalTransactions ? `${((stats.flaggedFraud / stats.totalTransactions) * 100).toFixed(1)}% of total` : null} color="red" delay={100} onActionClick={() => navigate('/transactions')} />
          <StatsCard icon={ShieldAlert} label="Smurfing Detected" value={stats?.smurfingDetected?.toLocaleString() || '0'} color="amber" delay={200} onActionClick={() => navigate('/cases')} />
          <StatsCard icon={ClipboardList} label="Pending Review" value={stats?.pendingReview?.toLocaleString() || '0'} subtitle="Needs analyst attention" color="purple" delay={300} onActionClick={() => navigate('/cases')} />
        </div>

        {/* ── Recent Transactions Panel ── */}
        <motion.div
          variants={itemVariants}
          style={{
            background: 'var(--bg-secondary)', borderRadius: '0.75rem',
            border: '1px solid var(--border-color)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            padding: '1.5rem', marginBottom: '2rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
            <h3 style={{ margin: 0, padding: 0, fontSize: '1.125rem', fontWeight: 700, color: '#1e293b', lineHeight: 1.3 }}>Recent Transactions</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <select className="input-field" style={{ padding: '6px 10px', width: 'auto', fontSize: '0.75rem' }}>
                <option value="">All Categories</option>
                <option value="shopping">Shopping</option>
                <option value="grocery">Grocery</option>
              </select>
              <select className="input-field" style={{ padding: '6px 10px', width: 'auto', fontSize: '0.75rem' }}>
                <option value="">Risk Level</option>
                <option value="high">High</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
          <div style={{ overflowX: 'auto', overflowY: 'hidden' }}>
            <TransactionTable transactions={filteredTxns} onRowClick={(txn) => setSelectedTxn(txn)} />
          </div>
        </motion.div>

        {/* ── Fraud Breakdown Panel ── */}
        <motion.div
          variants={itemVariants}
          style={{
            background: 'var(--bg-secondary)', borderRadius: '0.75rem',
            border: '1px solid var(--border-color)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            padding: '1.5rem', marginBottom: '2rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
            <h3 style={{ margin: 0, padding: 0, fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>Fraud Breakdown</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--bg-elevated)', padding: '4px', borderRadius: '8px' }}>
              {['Overview', 'By Category', 'By Risk'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: '6px 14px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    lineHeight: 1,
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s',
                    background: activeTab === tab ? 'var(--accent-primary)' : 'transparent',
                    color: activeTab === tab ? '#fff' : 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div style={{ minHeight: '300px' }}>
            <AnimatePresence mode="wait">
              <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }} style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>

                {activeTab === 'Overview' && (
                  <>
                    {stats?.dailyVolume?.length > 0 ? (
                      <ResponsiveContainer width="100%" height={280}>
                        <AreaChart data={stats.dailyVolume}>
                          <defs>
                            <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="_id" tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={(v) => v?.slice(5)} axisLine={{ stroke: '#1e293b' }} tickLine={false} />
                          <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                          <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(99,102,241,0.4)', strokeWidth: 1, strokeDasharray: '4 4' }} />
                          <Area type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2.5} fill="url(#colorCount)" name="Transactions" activeDot={{ r: 5, fill: '#6366f1', stroke: '#fff', strokeWidth: 2 }} />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>No volume data yet</div>
                    )}
                  </>
                )}

                {activeTab === 'By Risk' && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    {riskPieData.length > 0 ? (
                      <>
                        <ResponsiveContainer width="100%" height={240}>
                          <PieChart>
                            <Pie data={riskPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} isAnimationActive={true} animationDuration={1000} paddingAngle={2}>
                              {riskPieData.map((_, i) => (<Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />))}
                            </Pie>
                            <Tooltip content={<PieTooltip />} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem 1.5rem', marginTop: '1rem', justifyContent: 'center' }}>
                          {riskPieData.map((d, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              <span style={{ width: 10, height: 10, borderRadius: '50%', background: PIE_COLORS[i % PIE_COLORS.length], display: 'inline-block' }} />
                              {d.name} ({d.value})
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>No risk data yet</div>
                    )}
                  </div>
                )}

                {activeTab === 'By Category' && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center' }}>
                    <p>Category breakdown is not available for this time range.</p>
                  </div>
                )}

              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>

      </motion.div>

      <DetailPanel isOpen={!!selectedTxn} transaction={selectedTxn} onClose={() => setSelectedTxn(null)} />
    </div>
  );
}
