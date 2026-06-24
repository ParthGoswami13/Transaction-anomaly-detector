import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../api/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Mail, Lock, User, ArrowRight } from 'lucide-react';
function WaveBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0, background: '#f5f5f5' }}>
      <div className="absolute top-0 w-full h-[50vh] bg-blue-600 rounded-b-[100%] scale-x-150 transform -translate-y-1/4 shadow-lg">
        {/* Simple dotted wave representation via SVG */}
        <svg className="absolute inset-0 w-full h-full opacity-20" preserveAspectRatio="none" viewBox="0 0 100 100">
          <pattern id="dots" x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill="#ffffff" />
          </pattern>
          <rect x="0" y="0" width="100%" height="100%" fill="url(#dots)" />
        </svg>
      </div>
    </div>
  );
}

/* ── Form Variants ──────────────────────────────────────────── */
const formVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.3 } },
};

const fieldVariants = {
  initial: { opacity: 0, y: 12 },
  animate: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.1 + i * 0.08, duration: 0.4, ease: 'easeOut' },
  }),
};

export default function LoginPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', gender: 'M' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = isRegister
        ? await authAPI.register(form)
        : await authAPI.login(form.email, form.password);

      const { token, user } = res.data;
      localStorage.setItem('finguard_token', token);
      localStorage.setItem('finguard_user', JSON.stringify(user));
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#f5f5f5' }}>
      <WaveBackground />

      <motion.div
        className="bg-white w-full max-w-md relative z-10 overflow-hidden rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-100 mt-16"
        style={{ padding: '2.5rem' }}
        initial={{ opacity: 0, scale: 0.92, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        {/* Logo */}
        <motion.div
          className="flex items-center gap-3 mb-8"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <motion.div
            className="w-11 h-11 rounded-xl bg-blue-600 flex items-center justify-center"
            whileHover={{ scale: 1.1, rotate: 10 }}
          >
            <Shield size={24} className="text-white" />
          </motion.div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Operator Login</h1>
            <p className="text-xs text-gray-500">Access your dashboard</p>
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.div
            key={isRegister ? 'register' : 'login'}
            variants={formVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <h2 className="text-lg font-semibold mb-1">
              {isRegister ? 'Create Account' : 'Welcome Back'}
            </h2>
            <p className="text-sm text-[var(--text-secondary)] mb-6">
              {isRegister
                ? 'Set up your analyst credentials'
                : 'Sign in to access the fraud monitoring dashboard'}
            </p>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -8, height: 0 }}
                  className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {isRegister && (
                <motion.div custom={0} variants={fieldVariants} initial="initial" animate="animate">
                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
                    Full Name
                  </label>
                  <div className="relative">
                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                    <input
                      type="text"
                      className="input-field bg-gray-50"
                      style={{ paddingLeft: '2.5rem' }}
                      placeholder="John Doe"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      required
                    />
                  </div>
                </motion.div>
              )}

              <motion.div custom={isRegister ? 1 : 0} variants={fieldVariants} initial="initial" animate="animate">
                <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
                  Email
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    type="email"
                    className="input-field bg-gray-50"
                    style={{ paddingLeft: '2.5rem' }}
                    placeholder="analyst@finguard.ai"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                  />
                </div>
              </motion.div>

              <motion.div custom={isRegister ? 2 : 1} variants={fieldVariants} initial="initial" animate="animate">
                <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    type="password"
                    className="input-field bg-gray-50"
                    style={{ paddingLeft: '2.5rem' }}
                    placeholder="••••••••"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    required
                    minLength={6}
                  />
                </div>
              </motion.div>

                <motion.button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full overflow-hidden"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem', marginTop: '0.5rem' }}
                  custom={isRegister ? 3 : 2}
                  variants={fieldVariants}
                  initial="initial"
                  animate="animate"
                  whileTap={{ scale: 0.97 }}
                >
                  {loading && <span className="ripple" />}
                  {loading ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      {isRegister ? 'Create Account' : 'Sign In'}
                      <ArrowRight size={16} />
                    </>
                  )}
                </motion.button>
            </form>
          </motion.div>
        </AnimatePresence>

        <p className="text-center text-sm text-[var(--text-muted)] mt-6">
          {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
            onClick={() => {
              setIsRegister(!isRegister);
              setError('');
            }}
            className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
          >
            {isRegister ? 'Sign in' : 'Create one'}
          </button>
        </p>
      </motion.div>
    </div>
  );
}
