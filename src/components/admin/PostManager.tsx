import React, { useState } from 'react';
import {
  Edit3,
  EyeOff,
  History,
  Pin,
  PinOff,
  Send,
  Trash2,
  X,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatTimestamp, sanitizeHtml } from '../../lib/sanitize';
import { useAuth } from '../../hooks/useAuth';
import type { PostRevision, PostStatus, PostWithDetails } from '../../types/database';

interface PostManagerProps {
  posts: PostWithDetails[];
  onEditPost: (post: PostWithDetails) => void;
  onRefresh: () => void;
}

export const PostManager: React.FC<PostManagerProps> = ({
  posts,
  onEditPost,
  onRefresh,
}) => {
  const { user, isAdmin } = useAuth();
  const [filter, setFilter] = useState<'all' | PostStatus>('all');
  const [revisions, setRevisions] = useState<PostRevision[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const filteredPosts = posts.filter((p) => (filter === 'all' ? true : p.status === filter));

  const canModifyPost = (post: PostWithDetails) =>
    isAdmin || post.author_id === user?.id;

  const handleTogglePin = async (post: PostWithDetails) => {
    setBusyId(post.id);
    await supabase
      .from('posts')
      .update({ is_pinned: !post.is_pinned, version: post.version })
      .eq('id', post.id);
    setBusyId(null);
    onRefresh();
  };

  const handleStatusChange = async (post: PostWithDetails, nextStatus: PostStatus) => {
    setBusyId(post.id);
    await supabase
      .from('posts')
      .update({ status: nextStatus, version: post.version })
      .eq('id', post.id);
    setBusyId(null);
    onRefresh();
  };

  const handleSoftDelete = async (post: PostWithDetails) => {
    if (!window.confirm('Opravdu chcete tento příspěvek archivovat (odebrat z přenosu)?')) {
      return;
    }
    setBusyId(post.id);
    await supabase
      .from('posts')
      .update({ deleted_at: new Date().toISOString(), version: post.version })
      .eq('id', post.id);
    setBusyId(null);
    onRefresh();
  };

  const handleOpenRevisions = async (postId: string) => {
    const { data } = await supabase
      .from('post_revisions')
      .select('*, editor:profiles!post_revisions_changed_by_fkey(full_name, email)')
      .eq('post_id', postId)
      .order('created_at', { ascending: false });

    setRevisions((data as PostRevision[]) || []);
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-slate-900">
          Správa příspěvků ({posts.length})
        </h2>

        <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1 text-xs font-semibold">
          {(['all', 'published', 'draft', 'unpublished'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilter(tab)}
              className={`rounded-md px-2.5 py-1 transition ${
                filter === tab
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab === 'all' && 'Vše'}
              {tab === 'published' && 'Publikováno'}
              {tab === 'draft' && 'Koncepty'}
              {tab === 'unpublished' && 'Staženo'}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filteredPosts.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">
            V této kategorii nejsou žádné příspěvky.
          </p>
        ) : (
          filteredPosts.map((post) => {
            const editable = canModifyPost(post);
            return (
              <div
                key={post.id}
                className="rounded-xl border border-slate-200 p-4 transition hover:border-slate-300"
              >
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 font-bold ${
                        post.status === 'published'
                          ? 'bg-emerald-100 text-emerald-800'
                          : post.status === 'draft'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {post.status === 'published' && 'Publikováno'}
                      {post.status === 'draft' && 'Koncept'}
                      {post.status === 'unpublished' && 'Staženo'}
                    </span>

                    {post.is_pinned && (
                      <span className="rounded bg-indigo-100 px-2 py-0.5 font-bold text-indigo-800">
                        Připnuto
                      </span>
                    )}

                    {post.priority === 'breaking' && (
                      <span className="rounded bg-red-100 px-2 py-0.5 font-bold text-red-800">
                        Mimořádná
                      </span>
                    )}

                    {post.priority === 'important' && (
                      <span className="rounded bg-amber-100 px-2 py-0.5 font-bold text-amber-800">
                        Důležitá
                      </span>
                    )}

                    <span className="text-slate-500">
                      Autor: <strong>{post.author?.full_name || 'Neznámý'}</strong>
                    </span>
                  </div>

                  <div className="text-slate-400">
                    Vytvořeno: {formatTimestamp(post.created_at)} | Upraveno:{' '}
                    {formatTimestamp(post.updated_at)} (v{post.version})
                  </div>
                </div>

                {post.title && (
                  <h3 className="mb-1 text-sm font-bold text-slate-900">{post.title}</h3>
                )}

                <div
                  className="line-clamp-3 text-sm text-slate-700"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(post.content_html) }}
                />

                {post.media.length > 0 && (
                  <p className="mt-1.5 text-xs font-medium text-indigo-600">
                    Přiloženo fotografií: {post.media.length}
                  </p>
                )}

                {/* Ovládací lišta příspěvku */}
                <div className="mt-3 flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-2.5 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => handleOpenRevisions(post.id)}
                    className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-slate-600 hover:bg-slate-100"
                  >
                    <History className="h-3.5 w-3.5" />
                    Historie změn
                  </button>

                  {editable && (
                    <>
                      <button
                        type="button"
                        disabled={busyId === post.id}
                        onClick={() => onEditPost(post)}
                        className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-slate-800 hover:bg-slate-200"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        Upravit
                      </button>

                      {post.status === 'published' ? (
                        <>
                          <button
                            type="button"
                            disabled={busyId === post.id}
                            onClick={() => handleTogglePin(post)}
                            className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-1.5 text-indigo-700 hover:bg-indigo-100"
                          >
                            {post.is_pinned ? (
                              <>
                                <PinOff className="h-3.5 w-3.5" /> Odepnout
                              </>
                            ) : (
                              <>
                                <Pin className="h-3.5 w-3.5" /> Připnout
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            disabled={busyId === post.id}
                            onClick={() => handleStatusChange(post, 'unpublished')}
                            className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-1.5 text-amber-800 hover:bg-amber-100"
                          >
                            <EyeOff className="h-3.5 w-3.5" />
                            Stáhnout z publikace
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          disabled={busyId === post.id}
                          onClick={() => handleStatusChange(post, 'published')}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-emerald-700 hover:bg-emerald-100"
                        >
                          <Send className="h-3.5 w-3.5" />
                          Publikovat
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={busyId === post.id}
                        onClick={() => handleSoftDelete(post)}
                        className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2.5 py-1.5 text-rose-700 hover:bg-rose-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Smazat
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modální okno historie změn (Auditní stopa) */}
      {revisions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Auditní historie úprav</h3>
              <button
                type="button"
                onClick={() => setRevisions(null)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              {revisions.map((rev) => (
                <div key={rev.id} className="rounded-xl border border-slate-200 p-3 text-xs">
                  <div className="mb-1 flex justify-between font-semibold text-slate-700">
                    <span>
                      Verze {rev.version} ({rev.action}) –{' '}
                      {rev.editor?.full_name || 'Systém'}
                    </span>
                    <span className="text-slate-400">{formatTimestamp(rev.created_at)}</span>
                  </div>
                  <div
                    className="prose prose-sm max-w-none text-slate-600"
                    dangerouslySetInnerHTML={{
                      __html: sanitizeHtml(String(rev.snapshot?.content_html || '')),
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
