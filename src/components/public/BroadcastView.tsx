import React from 'react';
import { Calendar, Clock, Radio, Loader2 } from 'lucide-react';
import { useRealtimeBroadcast } from '../../hooks/useRealtimeBroadcast';
import { formatTimestamp } from '../../lib/sanitize';
import { ConnectionBadge } from '../common/ConnectionBadge';
import { PostCard } from './PostCard';
import type { BroadcastStatus } from '../../types/database';

interface BroadcastViewProps {
  slug: string;
  isEmbed?: boolean;
}

const STATUS_META: Record<
  BroadcastStatus,
  { label: string; badgeClass: string }
> = {
  live: {
    label: 'PROBÍHÁ ŽIVĚ',
    badgeClass: 'bg-red-600 text-white',
  },
  upcoming: {
    label: 'PŘIPRAVUJEME',
    badgeClass: 'bg-indigo-600 text-white',
  },
  paused: {
    label: 'POZASTAVENO',
    badgeClass: 'bg-amber-500 text-slate-950',
  },
  ended: {
    label: 'UKONČENO (ZÁZNAM)',
    badgeClass: 'bg-slate-700 text-white',
  },
};

export const BroadcastView: React.FC<BroadcastViewProps> = ({
  slug,
  isEmbed = false,
}) => {
  const {
    broadcast,
    posts,
    loading,
    loadingMore,
    hasMore,
    error,
    connectionStatus,
    loadOlderPosts,
  } = useRealtimeBroadcast({ slug, includeUnpublished: false });

  if (loading) {
    return (
      <div className="flex min-h-[260px] items-center justify-center p-8 text-slate-500">
        <Loader2 className="mr-2.5 h-5 w-5 animate-spin text-indigo-600" />
        Načítám živý přenos…
      </div>
    );
  }

  if (error || !broadcast) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-800">
        <p className="font-semibold">{error || 'Přenos se nepodařilo načíst.'}</p>
      </div>
    );
  }

  const statusInfo = STATUS_META[broadcast.status];
  const pinnedPost = posts.find((p) => p.is_pinned);
  const regularPosts = posts.filter((p) => !p.is_pinned);
  const timezone = broadcast.display_settings?.timezone;

  return (
    <div className={isEmbed ? 'space-y-4 p-3 sm:p-4' : 'space-y-6'}>
      {/* Hlavička přenosu */}
      <header className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-extrabold tracking-wide ${statusInfo.badgeClass}`}
            >
              {broadcast.status === 'live' && (
                <Radio className="h-3.5 w-3.5 animate-pulse" />
              )}
              {statusInfo.label}
            </span>

            {broadcast.scheduled_at && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <Calendar className="h-3.5 w-3.5" />
                {formatTimestamp(broadcast.scheduled_at, timezone)}
              </span>
            )}
          </div>

          {broadcast.status !== 'ended' && (
            <ConnectionBadge status={connectionStatus} />
          )}
        </div>

        <h1
          className={`${
            isEmbed ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-3xl'
          } font-extrabold tracking-tight text-slate-900`}
        >
          {broadcast.title}
        </h1>

        {broadcast.description && (
          <p className="mt-2 text-sm sm:text-base text-slate-600">
            {broadcast.description}
          </p>
        )}

        {broadcast.intro_text && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
            {broadcast.intro_text}
          </div>
        )}
      </header>

      {/* Připnutý příspěvek nad hlavním proudem */}
      {pinnedPost && (
        <section aria-label="Připnutá zpráva">
          <PostCard
            post={pinnedPost}
            showAuthor={broadcast.display_settings?.show_authors ?? true}
            showTimestamp={broadcast.display_settings?.show_timestamps ?? true}
            timezone={timezone}
            isPinnedBanner
          />
        </section>
      )}

      {/* Hlavní proud příspěvků */}
      <section aria-label="Proud zpráv" className="space-y-4">
        {posts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
            <Clock className="mx-auto mb-2 h-6 w-6 text-slate-400" />
            <p className="font-medium">Zatím nebyly publikovány žádné příspěvky.</p>
            <p className="mt-1 text-xs">
              Nové zprávy se zde objeví automaticky bez nutnosti obnovovat stránku.
            </p>
          </div>
        ) : (
          regularPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              showAuthor={broadcast.display_settings?.show_authors ?? true}
              showTimestamp={broadcast.display_settings?.show_timestamps ?? true}
              timezone={timezone}
            />
          ))
        )}
      </section>

      {/* Postupné načítání starších příspěvků */}
      {hasMore && posts.length > 0 && (
        <div className="pt-2 text-center">
          <button
            type="button"
            onClick={loadOlderPosts}
            disabled={loadingMore}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
          >
            {loadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
            {loadingMore ? 'Načítám historii…' : 'Načíst starší příspěvky'}
          </button>
        </div>
      )}
    </div>
  );
};
