import React, { useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { BroadcastView } from '../components/public/BroadcastView';

export const EmbedBroadcastPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const containerRef = useRef<HTMLDivElement>(null);

  // Odesílání aktuální výšky hostitelské stránce přes postMessage
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(() => {
      window.parent?.postMessage(
        {
          type: 'LIVEPRESS_EMBED_RESIZE',
          slug,
          height: el.scrollHeight,
        },
        '*'
      );
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [slug]);

  if (!slug) return null;

  return (
    <div ref={containerRef} className="min-h-screen bg-slate-50">
      <BroadcastView slug={slug} isEmbed />
      <footer className="border-t border-slate-200 bg-white px-4 py-2.5 text-right text-xs text-slate-500">
        <Link
          to={`/live/${slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:underline"
        >
          Otevřít v plném okně
          <ExternalLink className="h-3 w-3" />
        </Link>
      </footer>
    </div>
  );
};
