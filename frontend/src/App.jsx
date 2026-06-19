import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import TransactionsPage from './pages/TransactionsPage';
import CasesPage from './pages/CasesPage';
import FraudGraphPage from './pages/FraudGraphPage';
import KycPage from './pages/KycPage';

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('finguard_token');
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

function AppLayout({ children }) {
  return (
    <div className="app-layout">
      <Sidebar />
      {children}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        {/* Protected routes with sidebar layout */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout>
                <DashboardPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/transactions"
          element={
            <ProtectedRoute>
              <AppLayout>
                <TransactionsPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/cases"
          element={
            <ProtectedRoute>
              <AppLayout>
                <CasesPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/graph"
          element={
            <ProtectedRoute>
              <AppLayout>
                <FraudGraphPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/kyc"
          element={
            <ProtectedRoute>
              <AppLayout>
                <KycPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
