import React, { useEffect, useState } from 'react';
import { KeyRound, Loader2, Shield, UserCheck, UserPlus, UserX } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import type { Profile, UserRole } from '../../types/database';

export const UserManagement: React.FC = () => {
  const { sendPasswordReset, user: currentUser } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('journalist');
  const [creating, setCreating] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const loadProfiles = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    setProfiles((data as Profile[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    void loadProfiles();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setCreating(true);

    try {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: {
          action: 'create_user',
          email: email.trim(),
          password,
          full_name: fullName.trim(),
          role,
        },
      });

      if (error || data?.error) {
        throw new Error(data?.error || error?.message || 'Nepodařilo se založit účet.');
      }

      setFeedback({ type: 'ok', text: `Účet pro ${fullName} byl úspěšně vytvořen.` });
      setFullName('');
      setEmail('');
      setPassword('');
      setRole('journalist');
      await loadProfiles();
    } catch (err) {
      setFeedback({
        type: 'err',
        text:
          err instanceof Error
            ? `${err.message} (Ujistěte se, že je nasazena Edge Function manage-users, případně uživatele založte v Supabase Dashboard → Authentication → Users.)`
            : 'Chyba při zakládání účtu.',
      });
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (target: Profile) => {
    if (target.id === currentUser?.id) return;
    await supabase
      .from('profiles')
      .update({ is_active: !target.is_active })
      .eq('id', target.id);
    await loadProfiles();
  };

  const handleRoleChange = async (target: Profile, nextRole: UserRole) => {
    if (target.id === currentUser?.id) return;
    await supabase
      .from('profiles')
      .update({ role: nextRole })
      .eq('id', target.id);
    await loadProfiles();
  };

  const handleSendReset = async (targetEmail: string) => {
    try {
      await sendPasswordReset(targetEmail);
      setFeedback({ type: 'ok', text: `Odkaz pro obnovu hesla byl odeslán na ${targetEmail}.` });
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Odeslání e-mailu selhalo.',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Formulář pro vytvoření novináře */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900">
          <UserPlus className="h-5 w-5 text-indigo-600" />
          Založit nový redakční účet
        </h2>

        {feedback && (
          <div
            className={`mb-4 rounded-xl border p-3 text-sm ${
              feedback.type === 'ok'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-rose-200 bg-rose-50 text-rose-800'
            }`}
          >
            {feedback.text}
          </div>
        )}

        <form onSubmit={handleCreateUser} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Jméno a příjmení"
            className="rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
          />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="novinar@redakce.cz"
            className="rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
          />
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Dočasné heslo (min. 8 znaků)"
            className="rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="journalist">Role: Novinář</option>
            <option value="admin">Role: Administrátor</option>
          </select>
          <button
            type="submit"
            disabled={creating}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {creating && <Loader2 className="h-4 w-4 animate-spin" />}
            Vytvořit účet
          </button>
        </form>
      </div>

      {/* Seznam členů redakce */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="text-base font-bold text-slate-900">
            Členové redakce ({profiles.length})
          </h3>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">Načítám uživatele…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-3">Jméno</th>
                  <th className="px-5 py-3">E-mail</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Stav</th>
                  <th className="px-5 py-3 text-right">Akce</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {profiles.map((prof) => {
                  const isSelf = prof.id === currentUser?.id;
                  return (
                    <tr key={prof.id} className="hover:bg-slate-50/70">
                      <td className="px-5 py-3 font-semibold text-slate-900">
                        {prof.full_name} {isSelf && <span className="text-xs text-slate-400">(vy)</span>}
                      </td>
                      <td className="px-5 py-3 text-slate-600">{prof.email}</td>
                      <td className="px-5 py-3">
                        <select
                          disabled={isSelf}
                          value={prof.role}
                          onChange={(e) => handleRoleChange(prof, e.target.value as UserRole)}
                          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold disabled:opacity-60"
                        >
                          <option value="journalist">Novinář</option>
                          <option value="admin">Administrátor</option>
                        </select>
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                            prof.is_active
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          <Shield className="h-3 w-3" />
                          {prof.is_active ? 'Aktivní' : 'Deaktivován'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleSendReset(prof.email)}
                            title="Odeslat e-mail pro obnovu hesla"
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                          >
                            <KeyRound className="h-3.5 w-3.5" />
                            Obnova hesla
                          </button>
                          {!isSelf && (
                            <button
                              type="button"
                              onClick={() => handleToggleActive(prof)}
                              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold ${
                                prof.is_active
                                  ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              }`}
                            >
                              {prof.is_active ? (
                                <>
                                  <UserX className="h-3.5 w-3.5" /> Deaktivovat
                                </>
                              ) : (
                                <>
                                  <UserCheck className="h-3.5 w-3.5" /> Aktivovat
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
