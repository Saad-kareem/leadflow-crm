import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell.jsx';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { MetaProvider } from './context/MetaContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { DashboardPage } from './pages/DashboardPage.jsx';
import { InsightsPage } from './pages/InsightsPage.jsx';
import { LeadsPage } from './pages/LeadsPage.jsx';
import { LoginPage } from './pages/LoginPage.jsx';

/**
 * Shown while the stored token is checked against the API on boot.
 *
 * It is a quiet centred mark rather than a skeleton of the dashboard, because
 * at this point we do not yet know whether the dashboard is where this person
 * is going.
 */
const BootScreen = () => (
  <div className="flex min-h-dvh items-center justify-center">
    <div className="flex items-center gap-2.5 text-sm text-ink-muted">
      <svg viewBox="0 0 16 16" className="h-4 w-4 animate-spin" aria-hidden="true">
        <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.5" />
        <path d="M8 1.5A6.5 6.5 0 0 1 14.5 8" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      Loading your workspace
    </div>
  </div>
);

/**
 * Everything behind the login screen.
 *
 * `MetaProvider` sits inside the guard rather than around it, so the shared
 * vocabulary is only fetched once there is a session to fetch it with.
 */
const PrivateArea = () => {
  const { isAuthenticated, restoring } = useAuth();

  if (restoring) return <BootScreen />;
  if (!isAuthenticated) return <LoginPage />;

  return (
    <MetaProvider>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="leads" element={<LeadsPage />} />
          <Route path="insights" element={<InsightsPage />} />
          {/* Anything else is a mistyped URL, not a page — send them home
              rather than showing a dead end. */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </MetaProvider>
  );
};

export const App = () => (
  <BrowserRouter>
    <ToastProvider>
      <AuthProvider>
        <PrivateArea />
      </AuthProvider>
    </ToastProvider>
  </BrowserRouter>
);
