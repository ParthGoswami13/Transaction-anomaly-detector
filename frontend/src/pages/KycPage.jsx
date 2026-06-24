import { useState, useEffect } from 'react';
import { kycAPI } from '../api/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileCheck, AlertCircle, CheckCircle, Clock } from 'lucide-react';

const containerVariants = {
  animate: { transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

const fieldVariants = {
  initial: { opacity: 0, y: 10 },
  animate: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.1 + i * 0.08, duration: 0.35 },
  }),
};

export default function KycPage() {
  const currentUser = (() => {
    try { return JSON.parse(localStorage.getItem('finguard_user')) || {}; } catch { return {}; }
  })();
  const isAdmin = currentUser.role === 'admin';
  const [status, setStatus] = useState(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [manualData, setManualData] = useState({ name: '', dob: '', idNumber: '' });
  const [submittingManual, setSubmittingManual] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      const { data } = await kycAPI.getStatus();
      setStatus(data);
      if (data.latestRecord?.extractedData && !result) {
        setManualData({
          name: data.latestRecord.extractedData.name || '',
          dob: data.latestRecord.extractedData.dob || '',
          idNumber: data.latestRecord.extractedData.idNumber || '',
        });
      }
    } catch (err) {
      console.log('KYC status not available:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const { data } = await kycAPI.extract(formData);
      setResult(data.kycRecord);
      if (data.kycRecord?.extractedData) {
        setManualData({
          name: data.kycRecord.extractedData.name || '',
          dob: data.kycRecord.extractedData.dob || '',
          idNumber: data.kycRecord.extractedData.idNumber || '',
        });
      }
      loadStatus();
    } catch (err) {
      alert(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    setSubmittingManual(true);
    try {
      const { data } = await kycAPI.manual(manualData);
      setResult(data.kycRecord);
      loadStatus();
    } catch (err) {
      alert(err.response?.data?.error || 'Manual submission failed');
    } finally {
      setSubmittingManual(false);
    }
  };

  const handleVerify = async (statusLabel) => {
    if (!status?.latestRecord?._id) return;
    try {
      await kycAPI.verify(status.latestRecord._id, statusLabel, null);
      loadStatus();
      if (result && result._id === status.latestRecord._id) {
        setResult(prev => ({...prev, verificationStatus: statusLabel}));
      }
    } catch (err) {
      alert('Failed to update status');
    }
  };

  const statusIcon = (s) => {
    if (s === 'verified') return <CheckCircle size={20} className="text-emerald-400" />;
    if (s === 'rejected') return <AlertCircle size={20} className="text-red-400" />;
    return <Clock size={20} className="text-amber-400" />;
  };

  const statusAnimation = (s) => {
    if (s === 'pending') return { className: 'status-chip-pending' };
    if (s === 'rejected') return { className: 'status-chip-rejected' };
    return {};
  };

  return (
    <div className="main-content">
      <motion.div
        variants={containerVariants}
        initial="initial"
        animate="animate"
      >
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 800, margin: 0, padding: 0, color: 'var(--text-primary)', lineHeight: 1.2 }}>KYC Verification</h1>
          <motion.p variants={itemVariants} style={{ marginTop: '0.35rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Upload an identity document for AI-powered OCR verification</motion.p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upload Section */}
          <motion.div className="glass-card p-6 card-border-glow" variants={itemVariants}>
            <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
              <Upload size={16} className="text-indigo-400" />
              Upload ID Document
            </h3>

            {/* Drop Zone */}
            <label
              className={`drop-zone ${dragOver ? 'drag-over' : 'idle'} p-8 text-center cursor-pointer relative overflow-hidden`}
              style={{ minHeight: '250px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const dropped = e.dataTransfer.files[0];
                if (dropped) {
                  setFile(dropped);
                  setPreview(URL.createObjectURL(dropped));
                  setResult(null);
                }
              }}
            >
              <span className="sweep-overlay" aria-hidden="true" />
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              {preview ? (
                <div className="relative">
                  <motion.img
                    src={preview}
                    alt="ID Preview"
                    className="max-h-48 mx-auto rounded-lg object-contain"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  />
                  {uploading && (
                    <div className="absolute inset-0 rounded-lg overflow-hidden">
                      <div className="scan-line" />
                    </div>
                  )}
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Upload size={40} className="text-[var(--text-muted)]" style={{ marginBottom: '0.75rem' }} />
                  <p className="text-sm text-[var(--text-secondary)]">
                    Click to upload or drag & drop
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    JPG, PNG up to 10MB
                  </p>
                </motion.div>
              )}
            </label>

            <AnimatePresence>
              {file && (
                <motion.div
                  className="mt-4 flex items-center justify-between"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <p className="text-xs text-[var(--text-muted)] truncate max-w-[200px]">
                    {file.name}
                  </p>
                  <motion.button
                    className="btn-primary"
                    onClick={handleUpload}
                    disabled={uploading}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    {uploading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <FileCheck size={14} /> Extract & Verify
                      </>
                    )}
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Results Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Current Status */}
            <motion.div className="glass-card p-6 card-border-glow" variants={itemVariants}>
              <h3 className="font-semibold text-sm mb-4">Verification Status</h3>
              {loading ? (
                <p className="text-[var(--text-muted)]">Loading...</p>
              ) : status?.latestRecord ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <motion.span
                      className={statusAnimation(status.latestRecord.verificationStatus).className || ''}
                      animate={status.latestRecord.verificationStatus === 'verified' ? { scale: [1, 1.08, 1] } : {}}
                      transition={{ duration: 1.2, repeat: status.latestRecord.verificationStatus === 'verified' ? Infinity : 0 }}
                    >
                      {statusIcon(status.latestRecord.verificationStatus)}
                    </motion.span>
                    <div>
                      <p className="text-sm font-medium capitalize">
                        {status.latestRecord.verificationStatus}
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">
                        Submitted {new Date(status.latestRecord.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  {isAdmin && status.latestRecord.verificationStatus === 'pending' && (
                    <div className="flex gap-2 pt-2 mt-2 border-t border-[var(--border-color)]">
                      <motion.button
                        className="btn-success text-xs py-1.5 px-3 flex items-center gap-1"
                        onClick={() => handleVerify('verified')}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <CheckCircle size={14} /> Approve
                      </motion.button>
                      <motion.button
                        className="btn-danger text-xs py-1.5 px-3 flex items-center gap-1"
                        onClick={() => handleVerify('rejected')}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <AlertCircle size={14} /> Reject
                      </motion.button>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-[var(--text-muted)]">No KYC record found. Upload an ID to get started.</p>
              )}
            </motion.div>

            {/* KYC Information Form */}
            <motion.div className="glass-card p-6 card-border-glow" variants={itemVariants}>
              <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
                <FileCheck size={16} className="text-emerald-400" />
                KYC Information
              </h3>
              <form onSubmit={handleManualSubmit} className="space-y-4">
                <motion.div custom={0} variants={fieldVariants} initial="initial" animate="animate">
                  <label className="block text-xs text-[var(--text-muted)] mb-1">Full Name</label>
                  <input required className="input-field" value={manualData.name} onChange={(e) => setManualData({...manualData, name: e.target.value})} />
                </motion.div>
                <motion.div custom={1} variants={fieldVariants} initial="initial" animate="animate">
                  <label className="block text-xs text-[var(--text-muted)] mb-1">Date of Birth (YYYY-MM-DD)</label>
                  <input required className="input-field" placeholder="YYYY-MM-DD" value={manualData.dob} onChange={(e) => setManualData({...manualData, dob: e.target.value})} />
                </motion.div>
                <motion.div custom={2} variants={fieldVariants} initial="initial" animate="animate">
                  <label className="block text-xs text-[var(--text-muted)] mb-1">ID Number</label>
                  <input required className="input-field" value={manualData.idNumber} onChange={(e) => setManualData({...manualData, idNumber: e.target.value})} />
                </motion.div>
                <motion.button
                  type="submit"
                  className="btn-primary w-full mt-2 justify-center"
                  disabled={submittingManual || uploading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                >
                  {submittingManual ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit KYC Details'
                  )}
                </motion.button>
              </form>
              <AnimatePresence>
                {result && (
                  <motion.div
                    className="pt-4 mt-4 border-t border-[var(--border-color)]"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <span className={`badge ${
                      result.verificationStatus === 'verified' ? 'badge-success' :
                      result.verificationStatus === 'rejected' ? 'badge-danger' : 'badge-warning'
                    }`}>
                      Status: {result.verificationStatus}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
