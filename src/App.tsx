import React from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { isSupabaseConfigured } from './lib/supabase';
import { HomePage } from './pages/HomePage';
import { PublicBroadcastPage } from './pages/PublicBroadcastPage';
import { EmbedBroadcastPage } from './pages/EmbedBroadcastPage';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AdminBroadcastStudioPage } from './pages/AdminBroadcastStudioPage';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isActiveStaff, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">
        Ověřuji oprávnění…
      </div>
    );
  }

  if (!isActiveStaff) {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  if (!isSupabaseConfigured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
        <div className="max-w-lg rounded-2xl border border-amber-300 bg-white p-6 shadow-sm">
          <h1 className="text-lg font-bold text-slate-900">Chybí konfigurace Supabase</h1>
          <p className="mt-2 text-sm text-slate-600">
            Nastavte proměnné prostředí <code>VITE_SUPABASE_URL</code> a{' '}
            <code>VITE_SUPABASE_ANON_KEY</code> v souboru <code>.env</code> nebo v GitHub
            Repository Secrets.
          </p>
        </div>
      </div>
    );
  }

  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          {/* Veřejná část */}
          <Route path="/" element={<HomePage />} />
          <Route path="/live/:slug" element={<PublicBroadcastPage />} />
          <Route path="/embed/:slug" element={<EmbedBroadcastPage />} />

          {/* Redakční část */}
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/broadcast/:id"
            element={
              <ProtectedRoute>
                <AdminBroadcastStudioPage />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
};

export default App;
