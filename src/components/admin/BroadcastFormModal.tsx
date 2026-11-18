import React, { useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { generateSlug } from '../../lib/sanitize';
import { useAuth } from '../../hooks/useAuth';
import type { Broadcast, BroadcastStatus } from '../../types/database';

interface BroadcastFormModalProps {
  broadcast?: Broadcast | null;
  onClose: () => void;
  onSaved: () => void;
}

export const BroadcastFormModal: React.FC<BroadcastFormModalProps> = ({
  broadcast,
  onClose,
  onSaved,
}) => {
  const { user } = useAuth();
  const [title, setTitle] = useState(broadcast?.title || '');
  const [slug, setSlug] = useState(broadcast?.slug || '');
  const [description, setDescription] = useState(broadcast?.description || '');
  const [introText, setIntroText] = useState(broadcast?.intro_text || '');
  const [scheduledAt, setScheduledAt] = useState(
    broadcast?.scheduled_at ? broadcast.scheduled_at.slice(0, 16) : ''
  );
  const [status, setStatus] = useState<BroadcastStatus>(broadcast?.status || 'upcoming');
  const [showAuthors, setShowAuthors] = useState(
    broadcast?.display_settings?.show_authors ?? true
  );
  const [timezone, setTimezone] = useState(
    broadcast?.display_settings?.timezone || 'Europe/Prague'
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!broadcast) {
      setSlug(generateSlug(val));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const payload = {
      title: title.trim(),
      slug: generateSlug(slug),
      description: description.trim(),
      intro_text: introText.trim(),
      scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
      status,
      display_settings: {
        show_authors: showAuthors,
        show_timestamps: true,
        timezone,
      },
    };

    try {
      if (broadcast) {
        const { error: err } = await supabase
          .from('broadcasts')
          .update(payload)
          .eq('id', broadcast.id);
        if (err) throw err;
      } else {
        const { error: err } = await supabase.from('broadcasts').insert({
          ...payload,
          created_by: user?.id || null,
        });
        if (err) throw err;
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nepodařilo se uložit přenos.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-lg font-bold text-slate-900">
            {broadcast ? 'Upravit nastavení přenosu' : 'Vytvořit nový živý přenos'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-slate-600">
              Název události *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Např. Tisková konference k rozpočtu 2026"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-slate-600">
              URL identifikátor (slug) *
            </label>
            <input
              type="text"
              required
              value={slug}
              onChange={(e) => setSlug(generateSlug(e.target.value))}
              placeholder="tiskova-konference-rozpocet-2026"
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 font-mono text-xs"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase text-slate-600">
                Stav přenosu
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as BroadcastStatus)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="upcoming">Připravovaný</option>
                <option value="live">Aktivní (Živě)</option>
                <option value="paused">Pozastavený</option>
                <option value="ended">Ukončený</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase text-slate-600">
                Datum a čas zahájení
              </label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-slate-600">
              Krátký popis
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Stručné shrnutí pro přehled přenosů"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-slate-600">
              Úvodní informace pro čtenáře
            </label>
            <textarea
              rows={3}
              value={introText}
              onChange={(e) => setIntroText(e.target.value)}
              placeholder="Kontext události zobrazený v horní části živého přenosu…"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-3">
            <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={showAuthors}
                onChange={(e) => setShowAuthors(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600"
              />
              Zobrazovat jména autorů u příspěvků
            </label>

            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs"
            >
              <option value="Europe/Prague">Časová zóna: Europe/Prague</option>
              <option value="UTC">Časová zóna: UTC</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Zrušit
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Uložit přenos
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
