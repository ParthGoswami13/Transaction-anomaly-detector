import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../api/client';
import { Shield, Mail, Lock, User, ArrowRight } from 'lucide-react';

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
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] px-4">
      {/* Background gradient */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[40%] -left-[20%] w-[60%] h-[60%] rounded-full bg-indigo-500/5 blur-3xl" />
        <div className="absolute -bottom-[40%] -right-[20%] w-[60%] h-[60%] rounded-full bg-purple-500/5 blur-3xl" />
      </div>

      <div className="glass-card w-full max-w-md p-8 fade-in-up relative z-10">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Shield size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold gradient-text">FinGuard</h1>
            <p className="text-xs text-[var(--text-muted)]">AI Fraud Detection System</p>
          </div>
        </div>

        <h2 className="text-lg font-semibold mb-1">
          {isRegister ? 'Create Account' : 'Welcome Back'}
        </h2>
        <p className="text-sm text-[var(--text-secondary)] mb-6">
          {isRegister
            ? 'Set up your analyst credentials'
            : 'Sign in to access the fraud monitoring dashboard'}
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="text"
                  className="input-field pl-10"
                  placeholder="John Doe"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
              Email
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="email"
                className="input-field pl-10"
                placeholder="analyst@finguard.ai"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="password"
                className="input-field pl-10"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                minLength={6}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full justify-center"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                {isRegister ? 'Create Account' : 'Sign In'}
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <p className="text-center text-sm text-[var(--text-muted)] mt-6">
          {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            onClick={() => {
              setIsRegister(!isRegister);
              setError('');
            }}
            className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
          >
            {isRegister ? 'Sign in' : 'Create one'}
          </button>
        </p>
      </div>
    </div>
  );
}
