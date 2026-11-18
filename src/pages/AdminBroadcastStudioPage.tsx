import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Code2, ExternalLink, Loader2 } from 'lucide-react';
import { useRealtimeBroadcast } from '../hooks/useRealtimeBroadcast';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { ConnectionBadge } from '../components/common/ConnectionBadge';
import { RichTextEditor } from '../components/admin/RichTextEditor';
import { PostManager } from '../components/admin/PostManager';
import { EmbedGeneratorModal } from '../components/admin/EmbedGeneratorModal';
import type { BroadcastStatus, PostWithDetails } from '../types/database';

export const AdminBroadcastStudioPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { isAdmin } = useAuth();
  const {
    broadcast,
    posts,
    loading,
    error,
    connectionStatus,
    refreshAll,
  } = useRealtimeBroadcast({ broadcastId: id, includeUnpublished: true });

  const [editingPost, setEditingPost] = useState<PostWithDetails | null>(null);
  const [embedOpen, setEmbedOpen] = useState(false);

  const handleBroadcastStatusChange = async (nextStatus: BroadcastStatus) => {
    if (!broadcast || !isAdmin) return;
    await supabase
      .from('broadcasts')
      .update({ status: nextStatus })
      .eq('id', broadcast.id);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin text-indigo-600" />
        Otevírám redakční studio…
      </div>
    );
  }

  if (error || !broadcast) {
    return (
      <div className="p-8 text-center text-rose-700">
        {error || 'Přenos nebyl nalezen.'}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Horní pracovní lišta */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <Link
              to="/admin"
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Přehled
            </Link>
            <div>
              <h1 className="text-base font-extrabold text-slate-900">
                {broadcast.title}
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <ConnectionBadge status={connectionStatus} />

            {isAdmin && (
              <select
                value={broadcast.status}
                onChange={(e) => handleBroadcastStatusChange(e.target.value as BroadcastStatus)}
                className="rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-800"
              >
                <option value="upcoming">Stav: Připravovaný</option>
                <option value="live">Stav: ŽIVĚ</option>
                <option value="paused">Stav: Pozastavený</option>
                <option value="ended">Stav: Ukončený</option>
              </select>
            )}

            <button
              type="button"
              onClick={() => setEmbedOpen(true)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Code2 className="h-3.5 w-3.5" />
              Embed
            </button>

            <Link
              to={`/live/${broadcast.slug}`}
              target="_blank"
              className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Veřejný náhled
            </Link>
          </div>
        </div>
      </header>

      {/* Dvousloupcové redakční pracoviště */}
      <main className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <RichTextEditor
            broadcastId={broadcast.id}
            editingPost={editingPost}
            onCancelEdit={() => setEditingPost(null)}
            onSaved={refreshAll}
          />
        </div>

        <div className="lg:col-span-6">
          <PostManager
            posts={posts}
            onEditPost={(post) => {
              setEditingPost(post);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onRefresh={refreshAll}
          />
        </div>
      </main>

      {embedOpen && (
        <EmbedGeneratorModal
          broadcast={broadcast}
          onClose={() => setEmbedOpen(false)}
        />
      )}
    </div>
  );
};
