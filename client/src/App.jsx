import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/Layout';
import { useAuth } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';

const DashboardPage = lazy(() => import('./pages/DashboardPage').then((module) => ({ default: module.DashboardPage })));
const HistoryPage = lazy(() => import('./pages/HistoryPage').then((module) => ({ default: module.HistoryPage })));
const InboxPage = lazy(() => import('./pages/InboxPage').then((module) => ({ default: module.InboxPage })));
const ContactsPage = lazy(() => import('./pages/ContactsPage').then((module) => ({ default: module.ContactsPage })));
const AutomationPage = lazy(() => import('./pages/AutomationPage').then((module) => ({ default: module.AutomationPage })));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage').then((module) => ({ default: module.AnalyticsPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((module) => ({ default: module.SettingsPage })));
const QueuePage = lazy(() => import('./pages/QueuePage').then((module) => ({ default: module.QueuePage })));
const SendPage = lazy(() => import('./pages/SendPage').then((module) => ({ default: module.SendPage })));

function RouteLoading() {
  return <div className="app-loading">Loading...</div>;
}

function ProtectedLayout() {
  const { isAuthenticated, isInitializing } = useAuth();

  if (isInitializing) {
    return <div className="app-loading">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <AppLayout />;
}

export default function App() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route element={<ProtectedLayout />}>
        <Route index element={<Suspense fallback={<RouteLoading />}><DashboardPage /></Suspense>} />
        <Route path="send" element={<Suspense fallback={<RouteLoading />}><SendPage /></Suspense>} />
        <Route path="compose" element={<Suspense fallback={<RouteLoading />}><SendPage /></Suspense>} />
        <Route path="inbox" element={<Suspense fallback={<RouteLoading />}><InboxPage /></Suspense>} />
        <Route path="history" element={<Suspense fallback={<RouteLoading />}><HistoryPage /></Suspense>} />
        <Route path="contacts" element={<Suspense fallback={<RouteLoading />}><ContactsPage /></Suspense>} />
        <Route path="automation" element={<Suspense fallback={<RouteLoading />}><AutomationPage /></Suspense>} />
        <Route path="analytics" element={<Suspense fallback={<RouteLoading />}><AnalyticsPage /></Suspense>} />
        <Route path="settings" element={<Suspense fallback={<RouteLoading />}><SettingsPage /></Suspense>} />
        <Route path="queue" element={<Suspense fallback={<RouteLoading />}><QueuePage /></Suspense>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
