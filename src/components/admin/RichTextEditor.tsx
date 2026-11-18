import React, { useEffect, useRef, useState } from 'react';
import {
  Bold,
  Eye,
  FileEdit,
  Heading2,
  ImagePlus,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Loader2,
  Send,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import { sanitizeHtml, isValidHttpUrl } from '../../lib/sanitize';
import { uploadBroadcastImage, deleteBroadcastImage } from '../../lib/imageOptimizer';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import type { PostPriority, PostStatus, PostWithDetails } from '../../types/database';

interface DraftAttachment {
  id?: string;
  storage_path: string;
  public_url: string;
  alt_text: string;
  caption: string;
  mime_type: string;
  size_bytes: number;
}

interface RichTextEditorProps {
  broadcastId: string;
  editingPost: PostWithDetails | null;
  onCancelEdit: () => void;
  onSaved: () => void;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  broadcastId,
  editingPost,
  onCancelEdit,
  onSaved,
}) => {
  const { user } = useAuth();
  const editorRef = useRef<HTMLDivElement>(null);

  const [title, setTitle] = useState('');
  const [contentHtml, setContentHtml] = useState('');
  const [priority, setPriority] = useState<PostPriority>('normal');
  const [isPinned, setIsPinned] = useState(false);
  const [externalUrl, setExternalUrl] = useState('');
  const [externalUrlTitle, setExternalUrlTitle] = useState('');
  const [attachments, setAttachments] = useState<DraftAttachment[]>([]);
  const [removedMediaIds, setRemovedMediaIds] = useState<string[]>([]);

  const [showPreview, setShowPreview] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [autosaveStatus, setAutosaveStatus] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const autosaveKey = `livepress_autosave_${broadcastId}_${editingPost?.id || 'new'}`;

  // Inicializace formuláře při přepnutí na editaci existujícího příspěvku nebo nový příspěvek
  useEffect(() => {
    setErrorMsg(null);
    setShowPreview(false);
    setRemovedMediaIds([]);

    if (editingPost) {
      setTitle(editingPost.title || '');
      setContentHtml(editingPost.content_html || '');
      setPriority(editingPost.priority);
      setIsPinned(editingPost.is_pinned);
      setExternalUrl(editingPost.external_url || '');
      setExternalUrlTitle(editingPost.external_url_title || '');
      setAttachments(
        (editingPost.media || []).map((m) => ({
          id: m.id,
          storage_path: m.storage_path,
          public_url: m.public_url,
          alt_text: m.alt_text,
          caption: m.caption || '',
          mime_type: m.mime_type,
          size_bytes: m.size_bytes,
        }))
      );
      if (editorRef.current) {
        editorRef.current.innerHTML = editingPost.content_html || '';
      }

      // Kontrola, zda existuje novější lokální autosave než serverová verze
      const savedRaw = localStorage.getItem(autosaveKey);
      if (savedRaw) {
        try {
          const parsed = JSON.parse(savedRaw);
          if (parsed.savedAt > new Date(editingPost.updated_at).getTime()) {
            setTitle(parsed.title || '');
            setContentHtml(parsed.contentHtml || '');
            if (editorRef.current) editorRef.current.innerHTML = parsed.contentHtml || '';
            setAutosaveStatus('Obnovena neuložená lokální záloha');
          }
        } catch {
          localStorage.removeItem(autosaveKey);
        }
      }
    } else {
      const savedRaw = localStorage.getItem(autosaveKey);
      if (savedRaw) {
        try {
          const parsed = JSON.parse(savedRaw);
          setTitle(parsed.title || '');
          setContentHtml(parsed.contentHtml || '');
          setPriority(parsed.priority || 'normal');
          setExternalUrl(parsed.externalUrl || '');
          setExternalUrlTitle(parsed.externalUrlTitle || '');
          if (editorRef.current) editorRef.current.innerHTML = parsed.contentHtml || '';
          setAutosaveStatus('Obnoven rozepsaný text z paměti prohlížeče');
          return;
        } catch {
          localStorage.removeItem(autosaveKey);
        }
      }

      resetForm();
    }
  }, [editingPost, broadcastId]);

  // Automatické ukládání rozepsaného textu do localStorage (ochrana před ztrátou při výpadku)
  useEffect(() => {
    const hasContent = title.trim() || contentHtml.trim() || externalUrl.trim();
    if (!hasContent) return;

    const timer = setTimeout(() => {
      localStorage.setItem(
        autosaveKey,
        JSON.stringify({
          title,
          contentHtml,
          priority,
          externalUrl,
          externalUrlTitle,
          savedAt: Date.now(),
        })
      );
      setAutosaveStatus(`Automaticky zálohováno (${new Date().toLocaleTimeString('cs-CZ')})`);
    }, 800);

    return () => clearTimeout(timer);
  }, [title, contentHtml, priority, externalUrl, externalUrlTitle, autosaveKey]);

  const resetForm = () => {
    setTitle('');
    setContentHtml('');
    setPriority('normal');
    setIsPinned(false);
    setExternalUrl('');
    setExternalUrlTitle('');
    setAttachments([]);
    setRemovedMediaIds([]);
    setAutosaveStatus('');
    if (editorRef.current) {
      editorRef.current.innerHTML = '';
    }
  };

  const execCommand = (command: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    if (editorRef.current) {
      setContentHtml(editorRef.current.innerHTML);
    }
  };

  const handleInsertLink = () => {
    const url = window.prompt('Zadejte URL adresu odkazu (začínající http:// nebo https://):');
    if (!url) return;
    if (!isValidHttpUrl(url)) {
      setErrorMsg('Neplatná URL adresa. Odkaz musí začínat http:// nebo https://');
      return;
    }
    execCommand('createLink', url.trim());
  };

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setErrorMsg(null);
    setUploading(true);

    try {
      for (const file of Array.from(files)) {
        const uploaded = await uploadBroadcastImage(broadcastId, file);
        setAttachments((prev) => [
          ...prev,
          {
            storage_path: uploaded.storagePath,
            public_url: uploaded.publicUrl,
            alt_text: file.name.replace(/\.[^.]+$/, ''),
            caption: '',
            mime_type: uploaded.mimeType,
            size_bytes: uploaded.sizeBytes,
          },
        ]);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Nahrávání fotografie selhalo.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleRemoveAttachment = async (index: number) => {
    const target = attachments[index];
    if (!target) return;

    if (target.id) {
      setRemovedMediaIds((prev) => [...prev, target.id!]);
    } else {
      // Nově nahraný, ale dosud nepublikovaný soubor smažeme rovnou ze Storage
      await deleteBroadcastImage(target.storage_path);
    }

    setAttachments((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSave = async (targetStatus: PostStatus) => {
    if (!user) return;
    setErrorMsg(null);

    const sanitizedBody = sanitizeHtml(contentHtml);
    const plainText = sanitizedBody.replace(/<[^>]+>/g, '').trim();

    if (!plainText && !title.trim() && attachments.length === 0) {
      setErrorMsg('Příspěvek musí obsahovat alespoň text, titulek nebo fotografii.');
      return;
    }

    if (externalUrl.trim() && !isValidHttpUrl(externalUrl)) {
      setErrorMsg('Externí odkaz musí začínat http:// nebo https://.');
      return;
    }

    setSaving(true);

    try {
      let postId = editingPost?.id;

      if (editingPost) {
        // Aktualizace s kontrolou verze (ochrana proti souběžnému přepsání)
        const { data: updated, error: updateError } = await supabase
          .from('posts')
          .update({
            title: title.trim() || null,
            content_html: sanitizedBody,
            priority,
            status: targetStatus,
            is_pinned: targetStatus === 'published' ? isPinned : false,
            external_url: externalUrl.trim() || null,
            external_url_title: externalUrlTitle.trim() || null,
            version: editingPost.version,
          })
          .eq('id', editingPost.id)
          .select('id')
          .single();

        if (updateError) {
          if (updateError.message.includes('CONFLICT')) {
            throw new Error(
              'Konflikt při souběžné úpravě: Tento příspěvek mezitím upravil jiný kolega. Zrušte úpravy a načtěte nejnovější verzi.'
            );
          }
          throw updateError;
        }
        postId = updated.id;
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from('posts')
          .insert({
            broadcast_id: broadcastId,
            author_id: user.id,
            title: title.trim() || null,
            content_html: sanitizedBody,
            priority,
            status: targetStatus,
            is_pinned: targetStatus === 'published' ? isPinned : false,
            external_url: externalUrl.trim() || null,
            external_url_title: externalUrlTitle.trim() || null,
          })
          .select('id')
          .single();

        if (insertError) throw insertError;
        postId = inserted.id;
      }

      // Odstranění smazaných příloh
      if (removedMediaIds.length > 0) {
        await supabase.from('post_media').delete().in('id', removedMediaIds);
      }

      // Uložení/aktualizace příloh
      for (let i = 0; i < attachments.length; i++) {
        const att = attachments[i];
        if (att.id) {
          await supabase
            .from('post_media')
            .update({
              alt_text: att.alt_text.trim() || 'Fotografie z události',
              caption: att.caption.trim() || null,
              sort_order: i,
            })
            .eq('id', att.id);
        } else if (postId) {
          await supabase.from('post_media').insert({
            post_id: postId,
            broadcast_id: broadcastId,
            storage_path: att.storage_path,
            public_url: att.public_url,
            alt_text: att.alt_text.trim() || 'Fotografie z události',
            caption: att.caption.trim() || null,
            sort_order: i,
            mime_type: att.mime_type,
            size_bytes: att.size_bytes,
          });
        }
      }

      localStorage.removeItem(autosaveKey);
      resetForm();
      if (editingPost) onCancelEdit();
      onSaved();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Uložení příspěvku selhalo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      {/* Hlavička editoru s jasným rozlišením stavu (Nový příspěvek vs. Úprava publikovaného) */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-slate-900">
            {editingPost ? 'Úprava příspěvku' : 'Nový příspěvek'}
          </h2>
          {editingPost ? (
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                editingPost.status === 'published'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {editingPost.status === 'published' ? 'VEŘEJNÝ (v' + editingPost.version + ')' : 'KONCEPT'}
            </span>
          ) : (
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
              Rozpracovaný příspěvek
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {autosaveStatus && (
            <span className="text-xs text-slate-400">{autosaveStatus}</span>
          )}
          <button
            type="button"
            onClick={() => setShowPreview((p) => !p)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              showPreview
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Eye className="h-3.5 w-3.5" />
            {showPreview ? 'Zpět do editoru' : 'Náhled'}
          </button>
          {editingPost && (
            <button
              type="button"
              onClick={() => {
                resetForm();
                onCancelEdit();
              }}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Zrušit úpravu
            </button>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {showPreview ? (
        <div className="rounded-xl border border-indigo-200 bg-slate-50 p-5">
          <div className="mb-2 text-xs font-bold uppercase tracking-wider text-indigo-600">
            Náhled před publikováním ({priority === 'breaking' ? 'Mimořádná zpráva' : priority === 'important' ? 'Důležité' : 'Běžná zpráva'})
          </div>
          {title && <h3 className="mb-2 text-lg font-bold text-slate-900">{title}</h3>}
          <div
            className="prose prose-slate max-w-none text-sm"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(contentHtml) }}
          />
          {attachments.length > 0 && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {attachments.map((att, idx) => (
                <img
                  key={idx}
                  src={att.public_url}
                  alt={att.alt_text}
                  className="h-36 w-full rounded-lg object-cover"
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Nastavení důležitosti a připnutí */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setPriority('normal')}
                className={`rounded-md px-3 py-1.5 transition ${
                  priority === 'normal'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Běžná zpráva
              </button>
              <button
                type="button"
                onClick={() => setPriority('important')}
                className={`rounded-md px-3 py-1.5 transition ${
                  priority === 'important'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Důležitá
              </button>
              <button
                type="button"
                onClick={() => setPriority('breaking')}
                className={`rounded-md px-3 py-1.5 transition ${
                  priority === 'breaking'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                MIMOŘÁDNÁ
              </button>
            </div>

            <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              Připnout nahoru nad přenos
            </label>
          </div>

          {/* Titulek */}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Volitelný titulek zprávy…"
            className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm font-semibold text-slate-900 placeholder:font-normal placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />

          {/* Panel nástrojů formátování + ContentEditable */}
          <div className="overflow-hidden rounded-xl border border-slate-300 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20">
            <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-slate-50 px-2.5 py-1.5">
              <button
                type="button"
                onClick={() => execCommand('bold')}
                title="Tučné"
                className="rounded p-1.5 text-slate-700 hover:bg-slate-200"
              >
                <Bold className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => execCommand('italic')}
                title="Kurzíva"
                className="rounded p-1.5 text-slate-700 hover:bg-slate-200"
              >
                <Italic className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => execCommand('formatBlock', 'H3')}
                title="Podnadpis"
                className="rounded p-1.5 text-slate-700 hover:bg-slate-200"
              >
                <Heading2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => execCommand('insertUnorderedList')}
                title="Odrážkový seznam"
                className="rounded p-1.5 text-slate-700 hover:bg-slate-200"
              >
                <List className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => execCommand('insertOrderedList')}
                title="Číslovaný seznam"
                className="rounded p-1.5 text-slate-700 hover:bg-slate-200"
              >
                <ListOrdered className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleInsertLink}
                title="Vložit odkaz do textu"
                className="rounded p-1.5 text-slate-700 hover:bg-slate-200"
              >
                <LinkIcon className="h-4 w-4" />
              </button>

              <div className="mx-1 h-4 w-px bg-slate-300" />

              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-50">
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ImagePlus className="h-4 w-4" />
                )}
                <span>{uploading ? 'Nahrávám…' : 'Přidat fotografie'}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  disabled={uploading}
                  onChange={handleFilesSelected}
                  className="hidden"
                />
              </label>
            </div>

            <div
              ref={editorRef}
              contentEditable
              onInput={(e) => setContentHtml((e.target as HTMLDivElement).innerHTML)}
              data-placeholder="Napište aktuální zprávu z dění…"
              className="min-h-[140px] p-3.5 text-sm leading-relaxed text-slate-900 focus:outline-none empty:before:text-slate-400 empty:before:content-[attr(data-placeholder)]"
            />
          </div>

          {/* Nahrané fotografie s editací alt textu */}
          {attachments.length > 0 && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {attachments.map((att, idx) => (
                <div
                  key={att.storage_path}
                  className="flex gap-3 rounded-xl border border-slate-200 bg-slate-50 p-2.5"
                >
                  <img
                    src={att.public_url}
                    alt={att.alt_text}
                    className="h-20 w-20 shrink-0 rounded-lg object-cover"
                  />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <input
                      type="text"
                      value={att.alt_text}
                      onChange={(e) =>
                        setAttachments((prev) =>
                          prev.map((item, i) =>
                            i === idx ? { ...item, alt_text: e.target.value } : item
                          )
                        )
                      }
                      placeholder="Alternativní text (popis obrázku)"
                      className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs"
                    />
                    <input
                      type="text"
                      value={att.caption}
                      onChange={(e) =>
                        setAttachments((prev) =>
                          prev.map((item, i) =>
                            i === idx ? { ...item, caption: e.target.value } : item
                          )
                        )
                      }
                      placeholder="Veřejný popisek pod fotografií (volitelné)"
                      className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveAttachment(idx)}
                    title="Odebrat fotografii"
                    className="self-start rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Externí odkaz jako samostatná karta pod zprávou */}
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <input
              type="url"
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
              placeholder="Externí odkaz (https://…)"
              className="rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none"
            />
            <input
              type="text"
              value={externalUrlTitle}
              onChange={(e) => setExternalUrlTitle(e.target.value)}
              placeholder="Popisek odkazu (např. Celé znění tiskové zprávy)"
              className="rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {/* Akční tlačítka */}
          <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              disabled={saving || uploading}
              onClick={() => handleSave('draft')}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              <FileEdit className="h-4 w-4" />
              Uložit jako koncept
            </button>

            <button
              type="button"
              disabled={saving || uploading}
              onClick={() => handleSave('published')}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {editingPost?.status === 'published'
                ? 'Uložit úpravy živě'
                : 'Publikovat okamžitě'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
