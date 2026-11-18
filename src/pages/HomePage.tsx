import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Calendar, Lock, Radio } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatTimestamp } from '../lib/sanitize';
import type { Broadcast } from '../types/database';

export const HomePage: React.FC = () => {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('broadcasts')
      .select('*')
      .eq('is_archived', false)
      .order('scheduled_at', { ascending: false, nullsFirst: false })
      .then(({ data }) => {
        setBroadcasts((data as Broadcast[]) || []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-600 text-white">
              <Radio className="h-5 w-5" />
            </span>
            <div>
              <span className="block text-base font-extrabold tracking-tight text-slate-900">
                ŽIVÉ PŘENOSY
              </span>
              <span className="block text-xs text-slate-500">
                Online zpravodajství z událostí
              </span>
            </div>
          </div>

          <Link
            to="/admin"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
          >
            <Lock className="h-3.5 w-3.5" />
            Redakce
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-extrabold text-slate-900">
          Aktuální a ukončené přenosy
        </h1>

        {loading ? (
          <p className="text-sm text-slate-500">Načítám seznam událostí…</p>
        ) : broadcasts.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500">
            Zatím nejsou k dispozici žádné veřejné přenosy.
          </div>
        ) : (
          <div className="space-y-4">
            {broadcasts.map((item) => (
              <Link
                key={item.id}
                to={`/live/${item.slug}`}
                className="block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-300 hover:shadow"
              >
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <span
                    className={`rounded-md px-2.5 py-0.5 text-xs font-extrabold ${
                      item.status === 'live'
                        ? 'bg-red-600 text-white'
                        : item.status === 'upcoming'
                        ? 'bg-indigo-600 text-white'
                        : item.status === 'paused'
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-slate-700 text-white'
                    }`}
                  >
                    {item.status === 'live' && 'PROBÍHÁ ŽIVĚ'}
                    {item.status === 'upcoming' && 'PŘIPRAVUJEME'}
                    {item.status === 'paused' && 'POZASTAVENO'}
                    {item.status === 'ended' && 'UKONČENO'}
                  </span>

                  {item.scheduled_at && (
                    <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatTimestamp(item.scheduled_at)}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">{item.title}</h2>
                    {item.description && (
                      <p className="mt-1 text-sm text-slate-600">{item.description}</p>
                    )}
                  </div>
                  <ArrowRight className="h-5 w-5 shrink-0 text-slate-400" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
