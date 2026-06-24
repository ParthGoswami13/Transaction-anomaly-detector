import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Lenis from 'lenis';
import Topbar from './components/Topbar';
import Sidebar from './components/Sidebar';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import TransactionsPage from './pages/TransactionsPage';
import CasesPage from './pages/CasesPage';
import FraudGraphPage from './pages/FraudGraphPage';
import KycPage from './pages/KycPage';
import AdminPage from './pages/AdminPage';
import { ThemeProvider } from './context/ThemeContext';
import Background3D from './components/Background3D';

function getUser() {
  try {
    return JSON.parse(localStorage.getItem('finguard_user')) || {};
  } catch {
    return {};
  }
}

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('finguard_token');
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

function RoleRoute({ children, roles }) {
  const token = localStorage.getItem('finguard_token');
  if (!token) return <Navigate to="/login" replace />;
  const user = getUser();
  if (!roles.includes(user.role || 'user')) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function AppLayout({ children }) {
  return (
    <div className="app-layout page-shell">
      <Topbar />
      <Sidebar />
      {children}
    </div>
  );
}

/* Page transition wrapper */
const pageVariants = {
  initial: { opacity: 0, x: 30 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } },
  exit: { opacity: 0, x: -30, transition: { duration: 0.3 } },
};

function PageTransition({ children }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      style={{ width: '100%' }}
    >
      {children}
    </motion.div>
  );
}

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/login" element={<PageTransition><LoginPage /></PageTransition>} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout>
                <PageTransition><DashboardPage /></PageTransition>
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/transactions"
          element={
            <ProtectedRoute>
              <AppLayout>
                <PageTransition><TransactionsPage /></PageTransition>
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/cases"
          element={
            <RoleRoute roles={['admin']}>
              <AppLayout>
                <PageTransition><CasesPage /></PageTransition>
              </AppLayout>
            </RoleRoute>
          }
        />
        <Route
          path="/graph"
          element={
            <RoleRoute roles={['admin']}>
              <AppLayout>
                <PageTransition><FraudGraphPage /></PageTransition>
              </AppLayout>
            </RoleRoute>
          }
        />
        <Route
          path="/kyc"
          element={
            <ProtectedRoute>
              <AppLayout>
                <PageTransition><KycPage /></PageTransition>
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <RoleRoute roles={['admin']}>
              <AppLayout>
                <PageTransition><AdminPage /></PageTransition>
              </AppLayout>
            </RoleRoute>
          }
        />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  /* Initialize Lenis smooth scroll */
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smooth: true,
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    const rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);

  return (
    <ThemeProvider>
      <BrowserRouter>
        {/* Advanced 3D Background */}
        <Background3D />

        <AnimatedRoutes />
      </BrowserRouter>
    </ThemeProvider>
  );
}
