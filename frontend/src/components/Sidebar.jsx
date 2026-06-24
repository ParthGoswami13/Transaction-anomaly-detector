import { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Network,
  UserCheck,
  LogOut,
  Users,
  X,
  AlertTriangle,
  CheckCircle,
  FileText,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

function getUser() {
  try {
    return JSON.parse(localStorage.getItem('finguard_user')) || {};
  } catch {
    return {};
  }
}

const allNavItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['user', 'admin', 'analyst'] },
  { path: '/transactions', label: 'Provider Data', icon: Users, roles: ['user', 'admin', 'analyst'] },
  { path: '/cases', label: 'Anomaly Detection', icon: AlertTriangle, roles: ['admin'] },
  { path: '/cases-corrected', label: 'Anomaly Corrected', icon: CheckCircle, roles: ['admin'] },
  { path: '/reports', label: 'Reports', icon: FileText, roles: ['user', 'admin', 'analyst'] },
  { path: '/graph', icon: Network, label: 'Fraud Graph', roles: ['admin'] },
  { path: '/kyc', icon: UserCheck, label: 'KYC Verify', roles: ['user', 'admin', 'analyst'] },
  { path: '/admin', icon: Users, label: 'Admin Panel', roles: ['admin'] },
];

const containerVariants = {
  animate: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};

const itemVariants = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getUser();
  const role = user.role || 'user';
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const navItems = allNavItems.filter((item) => item.roles.includes(role));

  const handleLogout = () => {
    localStorage.removeItem('finguard_token');
    localStorage.removeItem('finguard_user');
    navigate('/login');
  };

  const toggleSidebar = () => {
    setCollapsed((prev) => {
      const next = !prev;
      document.body.classList.toggle('sidebar-collapsed', next);
      return next;
    });
  };

  const sidebarContent = (
    <>
      {/* User / Avatar */}
      <div style={{ padding: '1.5rem', marginTop: '0.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', fontWeight: 700, fontSize: '1.25rem', marginBottom: '0.75rem', border: '1px solid #bfdbfe' }}>
          {(user.name || 'S').charAt(0).toUpperCase()}
        </div>
        <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0, lineHeight: 1.3 }}>{user.name || 'Smith Lopez'}</p>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem', textTransform: 'capitalize' }}>{role || 'Operator'}</p>
      </div>

      {/* Navigation */}
      <motion.nav
        data-lenis-prevent="true"
        style={{ flex: 1, minHeight: 0, padding: '1rem 0.75rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}
        variants={containerVariants}
        initial="initial"
        animate="animate"
      >
        {navItems.map((item) => {
          const isActive = item.path === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(item.path);

          return (
            <motion.div key={item.path} variants={itemVariants}>
              <NavLink
                to={item.path}
                end={item.path === '/'}
                onClick={() => setMobileOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.65rem 1rem',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  textDecoration: 'none',
                  transition: 'all 0.2s',
                  color: isActive ? '#2563eb' : '#64748b',
                  background: isActive ? '#eff6ff' : 'transparent',
                }}
              >
                <motion.span
                  style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}
                  whileHover={{ x: 3 }}
                  transition={{ duration: 0.2 }}
                >
                  <motion.span whileHover={{ scale: 1.15 }} transition={{ duration: 0.15 }}>
                    <item.icon size={18} />
                  </motion.span>
                  {item.label}
                </motion.span>
              </NavLink>
            </motion.div>
          );
        })}
      </motion.nav>

      {/* Logout */}
      <div style={{ padding: '0.75rem', borderTop: '1px solid #f1f5f9' }}>
        <motion.button
          onClick={handleLogout}
          whileHover={{ x: 3, backgroundColor: 'rgba(239,68,68,0.08)' }}
          whileTap={{ scale: 0.97 }}
          style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%', padding: '0.625rem 1rem', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer', transition: 'all 0.2s' }}
        >
          <LogOut size={18} />
          Logout
        </motion.button>
      </div>
    </>
  );

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <motion.aside
        animate={{ x: collapsed ? -260 : 0 }}
        transition={{ type: 'spring', stiffness: 350, damping: 35 }}
        className="hidden md:flex"
        style={{ position: 'fixed', left: 0, top: 0, height: '100vh', width: 260, flexDirection: 'column', borderRight: '1px solid var(--border-color)', background: 'var(--bg-secondary)', zIndex: 40, paddingTop: 72 }}
      >
        {sidebarContent}
      </motion.aside>

      {/* ── Collapse toggle button (always visible on desktop) ── */}
      <motion.button
        className="hidden md:flex"
        animate={{ left: collapsed ? 0 : 244 }}
        transition={{ type: 'spring', stiffness: 350, damping: 35 }}
        onClick={toggleSidebar}
        title={collapsed ? 'Open sidebar' : 'Close sidebar'}
        style={{
          position: 'fixed',
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 50,
          background: '#2563eb',
          color: '#fff',
          border: 'none',
          borderRadius: collapsed ? '0 8px 8px 0' : '8px 0 0 8px',
          padding: '10px 6px',
          cursor: 'pointer',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '2px 0 8px rgba(37,99,235,0.25)',
        }}
      >
        {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
      </motion.button>

      {/* ── Mobile toggle button ── */}
      <button
        className="md:hidden"
        style={{ position: 'fixed', top: '80px', left: 0, zIndex: 60, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', padding: '8px', borderRadius: '0 8px 8px 0', color: '#2563eb', cursor: 'pointer', boxShadow: '2px 0 8px rgba(0,0,0,0.1)' }}
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle navigation"
      >
        {mobileOpen ? <X size={20} /> : <ChevronRight size={20} />}
      </button>

      {/* ── Mobile overlay ── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="sidebar-overlay md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Mobile sidebar ── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.aside
            initial={{ x: -260 }}
            animate={{ x: 0 }}
            exit={{ x: -260 }}
            transition={{ type: 'spring', stiffness: 350, damping: 35 }}
            className="md:hidden"
            style={{ position: 'fixed', left: 0, top: 0, paddingTop: 72, height: '100vh', width: 260, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border-color)', background: 'var(--bg-secondary)', zIndex: 50 }}
          >
            {sidebarContent}
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
