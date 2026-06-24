import { useState, useEffect } from 'react';
import { adminAPI, kycAPI } from '../api/client';
import StatsCard from '../components/StatsCard';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Shield, CheckCircle, XCircle, UserCheck } from 'lucide-react';

const containerVariants = {
  animate: { transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

const rowVariants = {
  initial: { opacity: 0, x: -20 },
  animate: (i) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.04, duration: 0.35, ease: 'easeOut' },
  }),
};

const kycCardVariants = {
  initial: { opacity: 0, x: 30 },
  animate: (i) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.06, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
  exit: {
    opacity: 0,
    scale: 0.9,
    x: -30,
    transition: { duration: 0.3 },
  },
};

export default function AdminPage() {
  const [users, setUsers] = useState([]);
  const [kycRecords, setKycRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingRole, setUpdatingRole] = useState(null);
  const [verifyingKyc, setVerifyingKyc] = useState(null);
  const [reviewKyc, setReviewKyc] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersRes, kycRes] = await Promise.all([
        adminAPI.getAllUsers(),
        adminAPI.getAllKyc(),
      ]);
      setUsers(usersRes.data.users);
      setKycRecords(kycRes.data.records);
    } catch (err) {
      console.error('Admin data load failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    setUpdatingRole(userId);
    try {
      await adminAPI.updateRole(userId, newRole);
      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, role: newRole } : u))
      );
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update role');
    } finally {
      setUpdatingRole(null);
    }
  };

  const handleKycVerify = async (recordId, status) => {
    setVerifyingKyc(recordId);
    try {
      await kycAPI.verify(recordId, status, null);
      setKycRecords((prev) =>
        prev.map((r) => (r._id === recordId ? { ...r, verificationStatus: status } : r))
      );
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update KYC');
    } finally {
      setVerifyingKyc(null);
      setReviewKyc(null);
    }
  };

  const currentUser = (() => {
    try { return JSON.parse(localStorage.getItem('finguard_user')) || {}; } catch { return {}; }
  })();

  if (loading) {
    return (
      <div className="main-content">
        <div className="page-header">
          <h1>Admin Panel</h1>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass-card p-4 h-20 shimmer" />
          ))}
        </div>
        <div className="glass-card p-8 shimmer h-48" />
      </div>
    );
  }

  const pendingKyc = kycRecords.filter((r) => r.verificationStatus === 'pending');

  return (
    <div className="main-content">
      <motion.div
        variants={containerVariants}
        initial="initial"
        animate="animate"
      >
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 800, margin: 0, padding: 0, color: 'var(--text-primary)', lineHeight: 1.2 }}>Admin Panel</h1>
          <motion.p variants={itemVariants} style={{ marginTop: '0.35rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Manage users, roles, and KYC approvals</motion.p>
        </div>

        {/* Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          <StatsCard
            icon={Users}
            label="Total Users"
            value={String(users.length)}
            color="indigo"
            delay={0}
          />
          <StatsCard
            icon={Shield}
            label="Admins"
            value={String(users.filter((u) => u.role === 'admin').length)}
            color="amber"
            delay={100}
          />
          <StatsCard
            icon={CheckCircle}
            label="KYC Verified"
            value={String(users.filter((u) => u.isKYCVerified).length)}
            color="emerald"
            delay={200}
          />
          <StatsCard
            icon={UserCheck}
            label="Pending KYC"
            value={String(pendingKyc.length)}
            color="amber"
            delay={300}
          />
        </div>

        <motion.div
          style={{ background: 'var(--bg-secondary)', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid var(--border-color)', marginBottom: '2rem' }}
          variants={itemVariants}
        >
          <div className="flex items-center gap-3 border-b border-gray-100" style={{ padding: '1.25rem 1.5rem' }}>
            <Users size={18} className="text-blue-500" />
            <h3 className="font-bold text-base text-gray-800" style={{ margin: 0 }}>User Management</h3>
          </div>
          <div className="overflow-x-auto p-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs text-gray-500 uppercase tracking-wider font-bold" style={{ padding: '1rem', verticalAlign: 'middle' }}>Name</th>
                  <th className="text-left text-xs text-gray-500 uppercase tracking-wider font-bold" style={{ padding: '1rem', verticalAlign: 'middle' }}>Email</th>
                  <th className="text-left text-xs text-gray-500 uppercase tracking-wider font-bold" style={{ padding: '1rem', verticalAlign: 'middle' }}>KYC</th>
                  <th className="text-left text-xs text-gray-500 uppercase tracking-wider font-bold" style={{ padding: '1rem', verticalAlign: 'middle' }}>Role</th>
                  <th className="text-left text-xs text-gray-500 uppercase tracking-wider font-bold" style={{ padding: '1rem', verticalAlign: 'middle' }}>Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <motion.tr
                    key={u._id}
                    custom={i}
                    variants={rowVariants}
                    initial="initial"
                    animate="animate"
                    className="border-b border-[var(--border-color)] transition-colors"
                    whileHover={{ backgroundColor: 'var(--bg-elevated)' }}
                    style={{
                      transition: 'background-color 0.5s ease',
                    }}
                  >
                    <td className="font-medium text-gray-800" style={{ padding: '1rem', verticalAlign: 'middle' }}>{u.name}</td>
                    <td className="text-gray-500" style={{ padding: '1rem', verticalAlign: 'middle' }}>{u.email}</td>
                    <td style={{ padding: '1rem', verticalAlign: 'middle' }}>
                      {u.isKYCVerified ? (
                        <span className="badge badge-success" style={{ textTransform: 'capitalize' }}>Verified</span>
                      ) : (
                        <span className="badge badge-warning" style={{ textTransform: 'capitalize' }}>Pending</span>
                      )}
                    </td>
                    <td style={{ padding: '1rem', verticalAlign: 'middle' }}>
                      {u._id === currentUser._id ? (
                        <span className={`badge ${u.role === 'admin' ? 'badge-warning' : 'badge-info'}`} style={{ textTransform: 'capitalize' }}>
                          {u.role} (you)
                        </span>
                      ) : (
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u._id, e.target.value)}
                          disabled={updatingRole === u._id}
                          className="input-field py-1 px-2 text-xs transition-colors duration-300"
                          style={{ minWidth: '100px', cursor: 'pointer' }}
                        >
                          <option value="user">User</option>
                          <option value="analyst">Analyst</option>
                          <option value="admin">Admin</option>
                        </select>
                      )}
                    </td>
                    <td className="text-xs text-gray-400" style={{ padding: '1rem', verticalAlign: 'middle' }}>
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Pending KYC */}
        <motion.div
          className="glass-card card-border-glow"
          variants={itemVariants}
        >
          <div className="flex items-center gap-2 border-b border-[var(--border-color)]" style={{ padding: '1.25rem 1.5rem' }}>
            <UserCheck size={18} className="text-emerald-400" />
            <h3 className="font-bold text-base text-gray-800" style={{ margin: 0 }}>Pending KYC Applications ({pendingKyc.length})</h3>
          </div>
          {pendingKyc.length === 0 ? (
            <motion.div
              className="p-8 text-center"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <CheckCircle size={40} className="mx-auto text-emerald-400 mb-2" />
              <p className="text-sm text-[var(--text-muted)]">No pending KYC applications.</p>
            </motion.div>
          ) : (
            <div className="overflow-x-auto p-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left text-xs text-gray-500 uppercase tracking-wider font-bold" style={{ padding: '1rem', verticalAlign: 'middle' }}>User Account</th>
                    <th className="text-left text-xs text-gray-500 uppercase tracking-wider font-bold" style={{ padding: '1rem', verticalAlign: 'middle' }}>Extracted Details</th>
                    <th className="text-right text-xs text-gray-500 uppercase tracking-wider font-bold" style={{ padding: '1rem', verticalAlign: 'middle' }}>Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <AnimatePresence mode="popLayout">
                    {pendingKyc.map((record, i) => (
                      <motion.tr
                        key={record._id}
                        custom={i}
                        variants={kycCardVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        className="transition-colors"
                        whileHover={{ backgroundColor: 'var(--bg-elevated)' }}
                      >
                        <td style={{ padding: '1rem', verticalAlign: 'middle' }}>
                          <p className="text-sm font-medium text-gray-800">
                            {record.userId?.name || 'Unknown User'}
                          </p>
                          <p className="text-xs text-[var(--text-muted)]">{record.userId?.email}</p>
                        </td>
                        <td style={{ padding: '1rem', verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                            <span>Name: <strong style={{ color: 'var(--text-primary)' }}>{record.extractedData?.name || 'N/A'}</strong></span>
                            <span>DOB: <strong style={{ color: 'var(--text-primary)' }}>{record.extractedData?.dob || 'N/A'}</strong></span>
                            <span>ID: <strong className="font-mono" style={{ color: 'var(--text-primary)' }}>{record.extractedData?.idNumber || 'N/A'}</strong></span>
                          </div>
                        </td>
                        <td style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'right' }}>
                          <motion.button
                            className="btn-primary text-xs py-1.5 px-3 inline-flex items-center gap-1"
                            onClick={() => setReviewKyc(record)}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <UserCheck size={14} /> Review Document
                          </motion.button>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </motion.div>

      {/* KYC Review Modal */}
      <AnimatePresence>
        {reviewKyc && (
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            style={{ paddingLeft: document.body.classList.contains('sidebar-collapsed') ? '1rem' : 'calc(260px + 1rem)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setReviewKyc(null)}
          >
            <motion.div
              className="glass-card w-full max-w-2xl p-6 overflow-hidden flex flex-col"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              style={{ maxHeight: '90vh' }}
            >
              <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-4">
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <Shield size={20} className="text-blue-500" />
                  Review KYC Document
                </h2>
                <button onClick={() => setReviewKyc(null)} className="text-gray-400 hover:text-gray-600 transition-colors p-1">
                  <XCircle size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto mb-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                {/* Document Preview */}
                <div style={{ background: '#f8fafc', borderRadius: '0.5rem', padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '1px solid #e2e8f0' }}>
                  {reviewKyc.documentUrl ? (
                    <img src={reviewKyc.documentUrl.startsWith('http') ? reviewKyc.documentUrl : `http://localhost:5000${reviewKyc.documentUrl}`} alt="KYC Document" style={{ maxWidth: '100%', maxHeight: '300px', objectFit: 'contain', borderRadius: '0.25rem' }} />
                  ) : (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                      <UserCheck size={48} className="mx-auto mb-2 opacity-50" />
                      <p>No document image provided</p>
                    </div>
                  )}
                </div>

                {/* Extracted Data */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <h4 style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.25rem' }}>User Information</h4>
                    <p style={{ fontSize: '0.875rem', fontWeight: 500, color: '#0f172a' }}>{reviewKyc.userId?.name} <span style={{ color: '#64748b', fontWeight: 400 }}>({reviewKyc.userId?.email})</span></p>
                  </div>
                  <div>
                    <h4 style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Extracted Name</h4>
                    <p style={{ fontSize: '0.875rem', fontWeight: 500, color: '#0f172a' }}>{reviewKyc.extractedData?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <h4 style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Date of Birth</h4>
                    <p style={{ fontSize: '0.875rem', fontWeight: 500, color: '#0f172a' }}>{reviewKyc.extractedData?.dob || 'N/A'}</p>
                  </div>
                  <div>
                    <h4 style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Document ID Number</h4>
                    <p style={{ fontSize: '0.875rem', fontWeight: 500, color: '#0f172a', fontFamily: 'monospace', background: '#f1f5f9', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', display: 'inline-block' }}>{reviewKyc.extractedData?.idNumber || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '1rem', borderTop: '1px solid #f1f5f9', paddingTop: '1rem', justifyContent: 'flex-end' }}>
                <motion.button
                  className="btn-danger flex items-center gap-2"
                  disabled={verifyingKyc === reviewKyc._id}
                  onClick={() => handleKycVerify(reviewKyc._id, 'rejected')}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <XCircle size={16} /> Reject Application
                </motion.button>
                <motion.button
                  className="btn-success flex items-center gap-2"
                  disabled={verifyingKyc === reviewKyc._id}
                  onClick={() => handleKycVerify(reviewKyc._id, 'verified')}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {verifyingKyc === reviewKyc._id ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : <CheckCircle size={16} />}
                  Approve Application
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
