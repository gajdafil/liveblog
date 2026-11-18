import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Archive,
  Code2,
  Edit3,
  ExternalLink,
  LogOut,
  Plus,
  Radio,
  Settings,
  Users,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatTimestamp } from '../lib/sanitize';
import { useAuth } from '../hooks/useAuth';
import { BroadcastFormModal } from '../components/admin/BroadcastFormModal';
import { EmbedGeneratorModal } from '../components/admin/EmbedGeneratorModal';
import { UserManagement } from '../components/admin/UserManagement';
import type { Broadcast } from '../types/database';

interface BroadcastWithStats extends Broadcast {
  published_count: number;
  last_post_at: string | null;
}

export const AdminDashboardPage: React.FC = () => {
  const { profile, isAdmin, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<'broadcasts' | 'users'>('broadcasts');
  const [broadcasts, setBroadcasts] = useState<BroadcastWithStats[]>([]);
  const [loading, setLoading] = useState(true);

  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingBroadcast, setEditingBroadcast] = useState<Broadcast | null>(null);
  const [embedBroadcast, setEmbedBroadcast] = useState<Broadcast | null>(null);

  const loadDashboard = async () => {
    setLoading(true);
    const { data: bData } = await supabase
      .from('broadcasts')
      .select('*')
      .order('created_at', { ascending: false });

    const list = (bData as Broadcast[]) || [];

    // Získání statistik publikovaných příspěvků pro přehled
    const enriched: BroadcastWithStats[] = await Promise.all(
      list.map(async (b) => {
        const { count } = await supabase
          .from('posts')
          .select('*', { count: 'exact', head: true })
          .eq('broadcast_id', b.id)
          .eq('status', 'published')
          .is('deleted_at', null);

        const { data: latest } = await supabase
          .from('posts')
          .select('updated_at')
          .eq('broadcast_id', b.id)
          .is('deleted_at', null)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        return {
          ...b,
          published_count: count || 0,
          last_post_at: latest?.updated_at || b.updated_at,
        };
      })
    );

    setBroadcasts(enriched);
    setLoading(false);
  };

  useEffect(() => {
    void loadDashboard();
  }, []);

  const handleToggleArchive = async (b: Broadcast) => {
    await supabase
      .from('broadcasts')
      .update({ is_archived: !b.is_archived })
      .eq('id', b.id);
    await loadDashboard();
  };

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Horní redakční lišta */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3.5">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white">
              <Radio className="h-5 w-5" />
            </span>
            <div>
              <span className="block text-base font-extrabold text-slate-900">
                Redakční dashboard
              </span>
              <span className="block text-xs text-slate-500">
                Přihlášen: <strong>{profile?.full_name}</strong> ({isAdmin ? 'Administrátor' : 'Novinář'})
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/"
              className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Veřejný web
            </Link>
            <button
              type="button"
              onClick={signOut}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200"
            >
              <LogOut className="h-3.5 w-3.5" />
              Odhlásit se
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {/* Přepínač sekcí pro administrátora */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('broadcasts')}
              className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                activeTab === 'broadcasts'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Radio className="h-4 w-4" />
              Přenosy ({broadcasts.length})
            </button>

            {isAdmin && (
              <button
                type="button"
                onClick={() => setActiveTab('users')}
                className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  activeTab === 'users'
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Users className="h-4 w-4" />
                Správa novinářů
              </button>
            )}
          </div>

          {isAdmin && activeTab === 'broadcasts' && (
            <button
              type="button"
              onClick={() => {
                setEditingBroadcast(null);
                setFormModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" />
              Nový přenos
            </button>
          )}
        </div>

        {activeTab === 'users' && isAdmin ? (
          <UserManagement />
        ) : loading ? (
          <div className="rounded-2xl bg-white p-8 text-center text-sm text-slate-500">
            Načítám přehled přenosů…
          </div>
        ) : (
          <div className="space-y-4">
            {broadcasts.map((b) => (
              <div
                key={b.id}
                className={`rounded-2xl border bg-white p-5 shadow-sm ${
                  b.is_archived ? 'border-slate-300 opacity-70' : 'border-slate-200'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-extrabold ${
                          b.status === 'live'
                            ? 'bg-red-600 text-white'
                            : b.status === 'upcoming'
                            ? 'bg-indigo-600 text-white'
                            : b.status === 'paused'
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-slate-700 text-white'
                        }`}
                      >
                        {b.status === 'live' && 'ŽIVĚ'}
                        {b.status === 'upcoming' && 'PŘIPRAVOVANÝ'}
                        {b.status === 'paused' && 'POZASTAVENÝ'}
                        {b.status === 'ended' && 'UKONČENÝ'}
                      </span>
                      {b.is_archived && (
                        <span className="rounded bg-slate-200 px-2 py-0.5 text-xs font-bold text-slate-700">
                          ARCHIVOVÁNO
                        </span>
                      )}
                      <span className="font-mono text-xs text-slate-400">/{b.slug}</span>
                    </div>

                    <h2 className="text-lg font-bold text-slate-900">{b.title}</h2>
                    <div className="text-xs text-slate-500">
                      Publikovaných příspěvků: <strong>{b.published_count}</strong> | Poslední aktivita:{' '}
                      {formatTimestamp(b.last_post_at)}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      to={`/admin/broadcast/${b.id}`}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      Vstoupit do redakce přenosu
                    </Link>

                    <Link
                      to={`/live/${b.slug}`}
                      target="_blank"
                      className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Veřejná stránka
                    </Link>

                    <button
                      type="button"
                      onClick={() => setEmbedBroadcast(b)}
                      className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <Code2 className="h-3.5 w-3.5" />
                      Embed kód
                    </button>

                    {isAdmin && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingBroadcast(b);
                            setFormModalOpen(true);
                          }}
                          title="Nastavení přenosu"
                          className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
                        >
                          <Settings className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleArchive(b)}
                          title={b.is_archived ? 'Obnovit z archivu' : 'Archivovat přenos'}
                          className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
                        >
                          <Archive className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {formModalOpen && (
        <BroadcastFormModal
          broadcast={editingBroadcast}
          onClose={() => setFormModalOpen(false)}
          onSaved={loadDashboard}
        />
      )}

      {embedBroadcast && (
        <EmbedGeneratorModal
          broadcast={embedBroadcast}
          onClose={() => setEmbedBroadcast(null)}
        />
      )}
    </div>
  );
};
