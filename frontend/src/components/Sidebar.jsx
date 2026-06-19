import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ArrowLeftRight,
  Network,
  ShieldCheck,
  UserCheck,
  LogOut,
  Shield,
} from 'lucide-react';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/transactions', icon: ArrowLeftRight, label: 'Transactions' },
  { path: '/cases', icon: ShieldCheck, label: 'Case Review' },
  { path: '/graph', icon: Network, label: 'Fraud Graph' },
  { path: '/kyc', icon: UserCheck, label: 'KYC Verify' },
];

export default function Sidebar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('finguard_token');
    localStorage.removeItem('finguard_user');
    navigate('/login');
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-[260px] flex flex-col border-r border-[var(--border-color)] bg-[var(--bg-secondary)] z-50">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-6 border-b border-[var(--border-color)]">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
          <Shield size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold gradient-text">FinGuard</h1>
          <p className="text-[0.65rem] text-[var(--text-muted)] tracking-wider uppercase">
            Fraud Detection
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-indigo-500/15 to-purple-500/10 text-indigo-400 border border-indigo-500/20'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]'
              }`
            }
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* User / Logout */}
      <div className="p-4 border-t border-[var(--border-color)]">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm font-medium text-[var(--text-muted)] hover:bg-red-500/10 hover:text-red-400 transition-all duration-200"
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </aside>
  );
}
