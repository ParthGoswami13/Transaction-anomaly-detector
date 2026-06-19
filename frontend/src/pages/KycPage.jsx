import { useState, useEffect } from 'react';
import { kycAPI } from '../api/client';
import { Upload, FileCheck, AlertCircle, CheckCircle, Clock } from 'lucide-react';

export default function KycPage() {
  const [status, setStatus] = useState(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [manualData, setManualData] = useState({ name: '', dob: '', idNumber: '' });
  const [submittingManual, setSubmittingManual] = useState(false);

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

  return (
    <div className="main-content">
      <div className="page-header">
        <h1>KYC Verification</h1>
        <p>Upload an identity document for AI-powered OCR verification</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Section */}
        <div className="glass-card p-6 fade-in-up">
          <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
            <Upload size={16} className="text-indigo-400" />
            Upload ID Document
          </h3>

          {/* Drop Zone */}
          <label className="block border-2 border-dashed border-[var(--border-color)] rounded-xl p-8 text-center cursor-pointer hover:border-indigo-500/50 transition-colors">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            {preview ? (
              <img
                src={preview}
                alt="ID Preview"
                className="max-h-48 mx-auto rounded-lg object-contain"
              />
            ) : (
              <div>
                <Upload size={40} className="mx-auto text-[var(--text-muted)] mb-3" />
                <p className="text-sm text-[var(--text-secondary)]">
                  Click to upload or drag & drop
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  JPG, PNG up to 10MB
                </p>
              </div>
            )}
          </label>

          {file && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-[var(--text-muted)] truncate max-w-[200px]">
                {file.name}
              </p>
              <button
                className="btn-primary"
                onClick={handleUpload}
                disabled={uploading}
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
              </button>
            </div>
          )}
        </div>

        {/* Results Section */}
        <div className="space-y-6">
          {/* Current Status */}
          <div className="glass-card p-6 fade-in-up" style={{ animationDelay: '100ms' }}>
            <h3 className="font-semibold text-sm mb-4">Verification Status</h3>
            {loading ? (
              <p className="text-[var(--text-muted)]">Loading...</p>
            ) : status?.latestRecord ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  {statusIcon(status.latestRecord.verificationStatus)}
                  <div>
                    <p className="text-sm font-medium capitalize">
                      {status.latestRecord.verificationStatus}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      Submitted {new Date(status.latestRecord.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {status.latestRecord.verificationStatus === 'pending' && (
                  <div className="flex gap-2 pt-2 mt-2 border-t border-[var(--border-color)]">
                    <button className="btn-success text-xs py-1.5 px-3 flex items-center gap-1" onClick={() => handleVerify('verified')}>
                      <CheckCircle size={14} /> Approve
                    </button>
                    <button className="btn-danger text-xs py-1.5 px-3 flex items-center gap-1" onClick={() => handleVerify('rejected')}>
                      <AlertCircle size={14} /> Reject
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-[var(--text-muted)]">No KYC record found. Upload an ID to get started.</p>
            )}
          </div>

          {/* KYC Information Form */}
          <div className="glass-card p-6 fade-in-up">
            <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
              <FileCheck size={16} className="text-emerald-400" />
              KYC Information
            </h3>
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">Full Name</label>
                <input required className="input-field" value={manualData.name} onChange={(e) => setManualData({...manualData, name: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">Date of Birth (YYYY-MM-DD)</label>
                <input required className="input-field" placeholder="YYYY-MM-DD" value={manualData.dob} onChange={(e) => setManualData({...manualData, dob: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">ID Number</label>
                <input required className="input-field" value={manualData.idNumber} onChange={(e) => setManualData({...manualData, idNumber: e.target.value})} />
              </div>
              <button type="submit" className="btn-primary w-full mt-2" disabled={submittingManual || uploading}>
                {submittingManual ? 'Submitting...' : 'Submit KYC Details'}
              </button>
            </form>
            {result && (
              <div className="pt-4 mt-4 border-t border-[var(--border-color)]">
                <span className={`badge ${
                  result.verificationStatus === 'verified' ? 'badge-success' :
                  result.verificationStatus === 'rejected' ? 'badge-danger' : 'badge-warning'
                }`}>
                  Status: {result.verificationStatus}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
