import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { RouteErrorBoundary } from './components/RouteErrorBoundary';
import { PageErrorBoundary } from './components/PageErrorBoundary';
import { AuthLayout } from './components/layout/AuthLayout';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ErrorPage } from './pages/ErrorPage';
import { useIsAuthenticated } from './stores/auth.store';

import { DashboardLayout } from './components/layout/DashboardLayout';
import { ProfilePage } from './pages/profile/ProfilePage';

// Protected Route Wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useIsAuthenticated();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          {/* Public Auth Routes - Aisladas con su propio ErrorBoundary */}
          <Route
            element={
              <RouteErrorBoundary context="auth">
                <AuthLayout />
              </RouteErrorBoundary>
            }
          >
            <Route
              path="/login"
              element={
                <PageErrorBoundary pageName="Login">
                  <LoginPage />
                </PageErrorBoundary>
              }
            />
            <Route
              path="/register"
              element={
                <PageErrorBoundary pageName="Register">
                  <RegisterPage />
                </PageErrorBoundary>
              }
            />
          </Route>

          {/* Protected Routes - Aisladas con su propio ErrorBoundary */}
          <Route
            element={
              <RouteErrorBoundary context="dashboard">
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              </RouteErrorBoundary>
            }
          >
            <Route
              path="/dashboard"
              element={
                <PageErrorBoundary pageName="Dashboard">
                  <div className="p-8">
                    <h1 className="text-2xl font-bold">Dashboard</h1>
                    <p>Welcome to Emotiox V3</p>
                  </div>
                </PageErrorBoundary>
              }
            />
            <Route
              path="/profile"
              element={
                <PageErrorBoundary pageName="Profile">
                  <ProfilePage />
                </PageErrorBoundary>
              }
            />
          </Route>

          {/* Default Redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* Error Route */}
          <Route path="*" element={<ErrorPage />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
