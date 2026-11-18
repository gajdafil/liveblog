import React, { useState } from 'react';
import { AlertTriangle, ExternalLink, Pin, Star, X, ZoomIn } from 'lucide-react';
import { sanitizeHtml, formatTimestamp, formatTimeOnly } from '../../lib/sanitize';
import type { PostMedia, PostWithDetails } from '../../types/database';

interface PostCardProps {
  post: PostWithDetails;
  showAuthor: boolean;
  showTimestamp: boolean;
  timezone?: string;
  isPinnedBanner?: boolean;
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  showAuthor,
  showTimestamp,
  timezone,
  isPinnedBanner = false,
}) => {
  const [lightboxMedia, setLightboxMedia] = useState<PostMedia | null>(null);

  const isBreaking = post.priority === 'breaking';
  const isImportant = post.priority === 'important';

  const containerStyle = isPinnedBanner
    ? 'border-2 border-indigo-600 bg-indigo-50/40 shadow-sm'
    : isBreaking
    ? 'border-l-4 border-l-red-600 border-y border-r border-red-200 bg-red-50/40 shadow-sm'
    : isImportant
    ? 'border-l-4 border-l-amber-500 border-y border-r border-amber-200 bg-amber-50/30'
    : 'border border-slate-200 bg-white';

  const timestampIso = post.published_at || post.created_at;
  const wasEdited =
    post.published_at &&
    new Date(post.updated_at).getTime() - new Date(post.published_at).getTime() > 60_000;

  return (
    <>
      <article
        className={`rounded-xl p-4 sm:p-5 transition-all ${containerStyle}`}
        aria-label={post.title || 'Příspěvek přenosu'}
      >
        {/* Horní lišta s časem, štítkem důležitosti a autorem */}
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            {isPinnedBanner && (
              <span className="inline-flex items-center gap-1 rounded bg-indigo-600 px-2 py-0.5 font-bold uppercase tracking-wider text-white">
                <Pin className="h-3 w-3" />
                Připnutá zpráva
              </span>
            )}

            {isBreaking && (
              <span className="inline-flex items-center gap-1 rounded bg-red-600 px-2 py-0.5 font-bold uppercase tracking-wider text-white">
                <AlertTriangle className="h-3 w-3" />
                Mimořádná zpráva
              </span>
            )}

            {isImportant && (
              <span className="inline-flex items-center gap-1 rounded bg-amber-500 px-2 py-0.5 font-bold uppercase tracking-wider text-slate-950">
                <Star className="h-3 w-3" />
                Důležité
              </span>
            )}

            {showTimestamp && (
              <time
                dateTime={timestampIso}
                title={formatTimestamp(timestampIso, timezone)}
                className="font-mono text-sm font-bold text-slate-800"
              >
                {formatTimeOnly(timestampIso, timezone)}
                <span className="ml-1.5 text-xs font-normal text-slate-500">
                  ({formatTimestamp(timestampIso, timezone).split(' ')[0]})
                </span>
              </time>
            )}

            {wasEdited && (
              <span className="text-[11px] italic text-slate-400">
                (aktualizováno {formatTimeOnly(post.updated_at, timezone)})
              </span>
            )}
          </div>

          {showAuthor && post.author?.full_name && (
            <span className="font-medium text-slate-600">
              {post.author.full_name}
            </span>
          )}
        </div>

        {/* Volitelný titulek zprávy */}
        {post.title && (
          <h3
            className={`mb-2 text-lg font-bold leading-snug ${
              isBreaking ? 'text-red-950' : 'text-slate-900'
            }`}
          >
            {post.title}
          </h3>
        )}

        {/* Sanitizovaný bohatý text */}
        {post.content_html && (
          <div
            className="prose prose-slate max-w-none text-[15px] leading-relaxed text-slate-800 prose-headings:font-bold prose-headings:text-slate-900 prose-a:text-indigo-600 prose-a:underline hover:prose-a:text-indigo-800 prose-ul:list-disc prose-ol:list-decimal"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(post.content_html) }}
          />
        )}

        {/* Fotografie / Galerie */}
        {post.media && post.media.length > 0 && (
          <div
            className={`mt-3.5 grid gap-2.5 ${
              post.media.length === 1
                ? 'grid-cols-1'
                : post.media.length === 2
                ? 'grid-cols-1 sm:grid-cols-2'
                : 'grid-cols-2 sm:grid-cols-3'
            }`}
          >
            {post.media.map((item) => (
              <figure
                key={item.id}
                className="group relative overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
              >
                <button
                  type="button"
                  onClick={() => setLightboxMedia(item)}
                  className="block w-full text-left focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <img
                    src={item.public_url}
                    alt={item.alt_text || post.title || 'Fotografie z události'}
                    loading="lazy"
                    className={`w-full object-cover transition-transform duration-200 group-hover:scale-[1.02] ${
                      post.media.length === 1 ? 'max-h-[460px]' : 'h-48'
                    }`}
                  />
                  <span className="absolute bottom-2 right-2 rounded-md bg-slate-900/70 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100">
                    <ZoomIn className="h-4 w-4" />
                  </span>
                </button>
                {(item.caption || item.alt_text) && (
                  <figcaption className="border-t border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-600">
                    {item.caption || item.alt_text}
                  </figcaption>
                )}
              </figure>
            ))}
          </div>
        )}

        {/* Externí odkaz */}
        {post.external_url && (
          <a
            href={post.external_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3.5 flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-indigo-700 transition-colors hover:border-indigo-300 hover:bg-indigo-50/60"
          >
            <span className="truncate">
              {post.external_url_title || post.external_url}
            </span>
            <ExternalLink className="h-4 w-4 shrink-0" />
          </a>
        )}
      </article>

      {/* Lightbox pro zvětšení fotografie */}
      {lightboxMedia && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4"
          onClick={() => setLightboxMedia(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-4xl overflow-hidden rounded-xl bg-slate-900 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setLightboxMedia(null)}
              className="absolute right-3 top-3 rounded-full bg-slate-900/80 p-2 text-white hover:bg-slate-800"
              aria-label="Zavřít náhled"
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={lightboxMedia.public_url}
              alt={lightboxMedia.alt_text}
              className="max-h-[80vh] w-auto object-contain"
            />
            {(lightboxMedia.caption || lightboxMedia.alt_text) && (
              <div className="bg-slate-900 px-4 py-3 text-sm text-slate-200">
                {lightboxMedia.caption || lightboxMedia.alt_text}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
