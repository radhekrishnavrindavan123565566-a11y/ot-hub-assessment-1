import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/layout/Navbar';

import LoginPage        from './pages/auth/LoginPage';
import SlotsListPage    from './pages/employee/SlotsListPage';
import MyOtPage         from './pages/employee/MyOtPage';
import CreateSlotPage   from './pages/manager/CreateSlotPage';
import SlotDetailPage   from './pages/manager/SlotDetailPage';
import ReportPage       from './pages/report/ReportPage';
import UsersPage        from './pages/admin/UsersPage';
import AuditLogPage     from './pages/admin/AuditLogPage';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

function ProtectedRoute({ children, allowedRoles }) {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user?.role))
    return <Navigate to="/slots" replace />;
  return children;
}

function AppLayout({ children }) {
  const { isAuthenticated } = useAuth();
  return (
    <div className="min-h-screen bg-slate-50">
      {isAuthenticated && <Navbar />}
      <main>{children}</main>
    </div>
  );
}

function AppRoutes() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route path="/slots" element={
          <ProtectedRoute><SlotsListPage /></ProtectedRoute>
        } />
        <Route path="/my-ot" element={
          <ProtectedRoute allowedRoles={['employee']}><MyOtPage /></ProtectedRoute>
        } />
        <Route path="/slots/new" element={
          <ProtectedRoute allowedRoles={['manager']}><CreateSlotPage /></ProtectedRoute>
        } />
        <Route path="/slots/:id" element={
          <ProtectedRoute allowedRoles={['manager', 'admin']}><SlotDetailPage /></ProtectedRoute>
        } />
        <Route path="/reports" element={
          <ProtectedRoute allowedRoles={['admin', 'manager']}><ReportPage /></ProtectedRoute>
        } />
        <Route path="/users" element={
          <ProtectedRoute allowedRoles={['admin']}><UsersPage /></ProtectedRoute>
        } />
        <Route path="/audit-logs" element={
          <ProtectedRoute allowedRoles={['admin']}><AuditLogPage /></ProtectedRoute>
        } />

        <Route path="/" element={<Navigate to="/slots" replace />} />
        <Route path="*" element={<Navigate to="/slots" replace />} />
      </Routes>
    </AppLayout>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                borderRadius: '12px',
                background: '#1e293b',
                color: '#f8fafc',
                fontSize: '14px',
                fontWeight: '500',
                padding: '12px 16px',
                boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              },
              success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
              error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
            }}
          />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
