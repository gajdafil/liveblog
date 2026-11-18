import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2, Lock, Radio } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export const AdminLoginPage: React.FC = () => {
  const { isActiveStaff, loading, signIn, sendPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetMode, setResetMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  if (!loading && isActiveStaff) {
    return <Navigate to="/admin" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setSubmitting(true);

    try {
      if (resetMode) {
        await sendPasswordReset(email);
        setMessage({
          type: 'ok',
          text: 'Pokud účet existuje, byl na e-mail odeslán odkaz pro nastavení nového hesla.',
        });
      } else {
        await signIn(email, password);
      }
    } catch (err) {
      setMessage({
        type: 'err',
        text: err instanceof Error ? err.message : 'Přihlášení se nezdařilo.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white">
            <Radio className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900">Redakční systém</h1>
            <p className="text-xs text-slate-500">Přihlášení pro novináře a administrátory</p>
          </div>
        </div>

        {message && (
          <div
            className={`mb-4 rounded-xl border p-3 text-sm ${
              message.type === 'ok'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-rose-200 bg-rose-50 text-rose-800'
            }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-slate-600">
              Redakční e-mail
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
            />
          </div>

          {!resetMode && (
            <div>
              <label className="mb-1 block text-xs font-bold uppercase text-slate-600">
                Heslo
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Lock className="h-4 w-4" />
            )}
            {resetMode ? 'Odeslat odkaz pro obnovu hesla' : 'Přihlásit se do redakce'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => {
              setResetMode((prev) => !prev);
              setMessage(null);
            }}
            className="text-xs font-semibold text-indigo-600 hover:underline"
          >
            {resetMode ? 'Zpět na přihlášení' : 'Zapomenuté heslo?'}
          </button>
        </div>
      </div>
    </div>
  );
};
