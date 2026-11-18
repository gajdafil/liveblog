import React, { useState } from 'react';
import { Check, Copy, X } from 'lucide-react';
import { getPublicSiteBaseUrl } from '../../lib/supabase';
import type { Broadcast } from '../../types/database';

interface EmbedGeneratorModalProps {
  broadcast: Broadcast;
  onClose: () => void;
}

export const EmbedGeneratorModal: React.FC<EmbedGeneratorModalProps> = ({
  broadcast,
  onClose,
}) => {
  const [width, setWidth] = useState('100%');
  const [height, setHeight] = useState('800');
  const [copiedType, setCopiedType] = useState<'standard' | 'cms' | null>(null);

  const embedUrl = `${getPublicSiteBaseUrl()}/#/embed/${broadcast.slug}`;

  const standardCode = `<iframe src="${embedUrl}" width="${width}" height="${height}" style="border:0;max-width:100%;" loading="lazy" title="${broadcast.title}"></iframe>`;

  const cmsSimpleCode = `<div style="width:100%;max-width:960px;margin:0 auto;"><iframe src="${embedUrl}" width="100%" height="${height}" frameborder="0" loading="lazy"></iframe></div>`;

  const copyToClipboard = async (text: string, type: 'standard' | 'cms') => {
    await navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Vložení přenosu do cizího webu (Embed)
            </h2>
            <p className="text-xs text-slate-500">{broadcast.title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">
                Šířka (např. 100% nebo 800px)
              </label>
              <input
                type="text"
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">
                Výška v pixelech
              </label>
              <input
                type="number"
                min={300}
                max={3000}
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-slate-600">
                Standardní responzivní HTML kód
              </span>
              <button
                type="button"
                onClick={() => copyToClipboard(standardCode, 'standard')}
                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
              >
                {copiedType === 'standard' ? (
                  <>
                    <Check className="h-3.5 w-3.5" /> Zkopírováno
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" /> Kopírovat kód
                  </>
                )}
              </button>
            </div>
            <pre className="overflow-x-auto rounded-xl bg-slate-900 p-3 text-xs text-slate-100">
              {standardCode}
            </pre>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-slate-600">
                Zjednodušená varianta pro redakční systémy (WordPress / CMS)
              </span>
              <button
                type="button"
                onClick={() => copyToClipboard(cmsSimpleCode, 'cms')}
                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
              >
                {copiedType === 'cms' ? (
                  <>
                    <Check className="h-3.5 w-3.5" /> Zkopírováno
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" /> Kopírovat pro CMS
                  </>
                )}
              </button>
            </div>
            <pre className="overflow-x-auto rounded-xl bg-slate-900 p-3 text-xs text-slate-100">
              {cmsSimpleCode}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
