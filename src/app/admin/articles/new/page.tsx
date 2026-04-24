'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useToast } from '@/components/admin/Toast';
import ImageUploader from '@/components/admin/ImageUploader';
import { ARTICLE_CATEGORIES } from '@/lib/article-categories';
import { toDatetimeLocalValue } from '@/lib/datetime-local';
import { useConfirm } from '@/components/admin/useConfirm';

const RichEditor = dynamic(() => import('@/components/admin/RichEditor'), { ssr: false });

type Status = 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'PENDING_REVIEW';

/**
 * Default scheduled time = 1 hour from now, rounded up to the next hour.
 * Good ergonomics — the editor just pushes "save" and gets a sensible slot.
 */
function defaultScheduledFor(): string {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return toDatetimeLocalValue(d);
}

export default function NewArticlePage() {
  const [activeTab, setActiveTab] = useState<'tr' | 'en'>('tr');
  const [form, setForm] = useState({
    titleTr: '',
    titleEn: '',
    contentTr: '',
    contentEn: '',
    category: 'GENRE',
    status: 'DRAFT' as Status,
    scheduledFor: '',
    featuredImage: '',
    relatedGenreId: '',
    relatedArtistId: '',
  });
  const [genres, setGenres] = useState<{ id: string; nameTr: string }[]>([]);
  const [artists, setArtists] = useState<{ id: string; name: string }[]>([]);
  const [canPublish, setCanPublish] = useState<boolean>(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { confirm, dialog: confirmDialog } = useConfirm();

  useEffect(() => {
    fetch('/api/genres?all=true').then((r) => r.json()).then(setGenres);
    fetch('/api/artists?all=true').then((r) => r.json()).then(setArtists);
    // Yayın yetkisi kontrolü. Yoksa form "Onaya Gönder" moduna geçer —
    // Publish/Schedule seçenekleri gizlenir, yerine tek bir onay akışı.
    fetch('/api/users/me')
      .then((r) => r.json())
      .then((d) => {
        const cp = d?.isSuperAdmin || d?.sections?.ARTICLE?.canPublish;
        setCanPublish(!!cp);
      })
      .catch(() => {});
  }, []);

  function updateStatus(next: Status) {
    setForm((f) => ({
      ...f,
      status: next,
      // When the editor flips to SCHEDULED and hasn't picked a time yet,
      // prefill a sensible one. Clearing it on flip-back would surprise
      // them if they bounce between statuses, so leave it alone.
      scheduledFor:
        next === 'SCHEDULED' && !f.scheduledFor ? defaultScheduledFor() : f.scheduledFor,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (form.status === 'PUBLISHED' && canPublish) {
      const ok = await confirm({
        title: 'Yayına al',
        description: `"${form.titleTr}" makalesi siteye anında yansıyacak.`,
        confirmLabel: 'Yayına Al',
      });
      if (!ok) return;
    }

    if (form.status === 'PENDING_REVIEW') {
      const ok = await confirm({
        title: 'Onaya gönder',
        description: `"${form.titleTr}" makalesi Super Admin'e gönderilecek.`,
        confirmLabel: 'Onaya Gönder',
      });
      if (!ok) return;
    }

    if (form.status === 'SCHEDULED' && !form.scheduledFor) {
      setError('Zamanlanmış yayın için bir tarih/saat seç.');
      return;
    }

    setLoading(true);
    const res = await fetch('/api/articles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        scheduledFor: form.status === 'SCHEDULED' ? form.scheduledFor : null,
        featuredImage: form.featuredImage || null,
        relatedGenreId: form.relatedGenreId || null,
        relatedArtistId: form.relatedArtistId || null,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || 'Kaydedilemedi');
      toast(data.error || 'Kaydedilemedi', 'error');
    } else {
      toast(
        form.status === 'SCHEDULED'
          ? 'Makale zamanlandı'
          : form.status === 'PUBLISHED'
            ? canPublish
              ? 'Makale yayında'
              : 'Makale onaya gönderildi'
            : form.status === 'PENDING_REVIEW'
              ? 'Makale onaya gönderildi'
              : 'Taslak kaydedildi',
      );
      router.push('/admin/articles');
    }
  }

  const saveLabel =
    form.status === 'PENDING_REVIEW'
      ? 'Onaya Gönder'
      : form.status === 'PUBLISHED'
        ? canPublish ? 'Yayına Al' : 'Onaya Gönder'
        : form.status === 'SCHEDULED'
        ? 'Yayın Zamanla'
        : 'Taslağı Kaydet';

  return (
    <div className="max-w-4xl">
      {confirmDialog}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">Yeni Makale</h1>
        <Link href="/admin/articles" className="text-zinc-500 hover:text-zinc-100 text-sm">
          ← Geri
        </Link>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-300 text-sm rounded-lg">{error}</div>}

        {/* Meta */}
        <div className="bg-zinc-900/40 p-6 rounded-lg border border-zinc-800 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="art-cat" className="block text-sm font-semibold text-zinc-100 tracking-tight mb-1">
                Kategori
              </label>
              <select
                id="art-cat"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 focus:border-zinc-500 rounded-lg outline-none text-zinc-100 focus:ring-zinc-500/20 focus:ring-2"
              >
                {ARTICLE_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.labelTr}
                  </option>
                ))}
              </select>
            </div>
            <StatusSelector
              status={form.status}
              onChange={updateStatus}
              scheduledFor={form.scheduledFor}
              onScheduledForChange={(v) => setForm({ ...form, scheduledFor: v })}
              canPublish={canPublish}
            />
          </div>
          <ImageUploader
            value={form.featuredImage}
            onChange={(url) => setForm({ ...form, featuredImage: url })}
            category="article"
            label="Öne Çıkan Görsel"
            aspect="wide"
          />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="art-genre" className="block text-sm font-semibold text-zinc-100 tracking-tight mb-1">
                İlgili Tür
              </label>
              <select
                id="art-genre"
                value={form.relatedGenreId}
                onChange={(e) => setForm({ ...form, relatedGenreId: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 focus:border-zinc-500 rounded-lg outline-none text-zinc-100 focus:ring-zinc-500/20 focus:ring-2"
              >
                <option value="">Yok</option>
                {genres.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.nameTr}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="art-artist" className="block text-sm font-semibold text-zinc-100 tracking-tight mb-1">
                İlgili Sanatçı
              </label>
              <select
                id="art-artist"
                value={form.relatedArtistId}
                onChange={(e) => setForm({ ...form, relatedArtistId: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 focus:border-zinc-500 rounded-lg outline-none text-zinc-100 focus:ring-zinc-500/20 focus:ring-2"
              >
                <option value="">Yok</option>
                {artists.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Language Tabs */}
        <div className="bg-zinc-900/40 rounded-lg border border-zinc-800 overflow-hidden">
          <div className="flex border-b border-zinc-800">
            <button
              type="button"
              onClick={() => setActiveTab('tr')}
              className={`flex-1 py-3 text-sm font-medium ${
                activeTab === 'tr' ? 'bg-white text-zinc-950' : 'text-zinc-300 hover:bg-zinc-800'
              }`}
            >
              Türkçe
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('en')}
              className={`flex-1 py-3 text-sm font-medium ${
                activeTab === 'en' ? 'bg-white text-zinc-950' : 'text-zinc-300 hover:bg-zinc-800'
              }`}
            >
              English
            </button>
          </div>
          <div className="p-6 space-y-4">
            {activeTab === 'tr' ? (
              <>
                <div>
                  <label
                    htmlFor="art-title-tr"
                    className="block text-sm font-semibold text-zinc-100 tracking-tight mb-1"
                  >
                    Başlık (TR)
                  </label>
                  <input
                    id="art-title-tr"
                    type="text"
                    value={form.titleTr}
                    onChange={(e) => setForm({ ...form, titleTr: e.target.value })}
                    className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 focus:border-zinc-500 rounded-lg outline-none text-zinc-100 text-lg placeholder:text-zinc-600 focus:ring-zinc-500/20 focus:ring-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">İçerik (TR)</label>
                  <RichEditor
                    content={form.contentTr}
                    onChange={(v) => setForm({ ...form, contentTr: v })}
                    placeholder="Türkçe içerik yazın…"
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label
                    htmlFor="art-title-en"
                    className="block text-sm font-semibold text-zinc-100 tracking-tight mb-1"
                  >
                    Title (EN)
                  </label>
                  <input
                    id="art-title-en"
                    type="text"
                    value={form.titleEn}
                    onChange={(e) => setForm({ ...form, titleEn: e.target.value })}
                    className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 focus:border-zinc-500 rounded-lg outline-none text-zinc-100 text-lg placeholder:text-zinc-600 focus:ring-zinc-500/20 focus:ring-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Content (EN)</label>
                  <RichEditor
                    content={form.contentEn}
                    onChange={(v) => setForm({ ...form, contentEn: v })}
                    placeholder="Write English content…"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-4 py-3 rounded-lg bg-zinc-900/60 border border-zinc-800">
          <Link
            href="/admin/articles"
            className="px-3.5 py-2 text-[12px] font-medium text-zinc-300 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:text-white rounded-md transition-colors"
          >
            İptal
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-white text-zinc-950 text-[12px] font-semibold rounded-md hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <>
                <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
                  <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
                Kaydediliyor…
              </>
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 13l4 4L19 7" />
                </svg>
                {saveLabel}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

/**
 * Tri-state status picker. PUBLISHED publishes immediately; SCHEDULED reveals
 * a datetime-local input that must be in the future for a successful POST.
 */
function StatusSelector({
  status,
  onChange,
  scheduledFor,
  onScheduledForChange,
  canPublish,
}: {
  status: Status;
  onChange: (v: Status) => void;
  scheduledFor: string;
  onScheduledForChange: (v: string) => void;
  /**
   * Kullanıcının bu bölümde yayın yetkisi var mı? Yoksa "Zamanla" ve
   * "Yayına Al" seçenekleri gizlenir, yerine tek bir "Onaya Gönder"
   * adımı gelir. Super Admin onaylayınca içerik otomatik yayına girer.
   */
  canPublish: boolean;
}) {
  // Yayın yetkisi olanlara tam akış, olmayanlara sadece Taslak / Onay
  const options: { v: Status; label: string; hint: string }[] = canPublish
    ? [
        { v: 'DRAFT', label: 'Taslak', hint: 'Sitede görünmez' },
        { v: 'SCHEDULED', label: 'Zamanla', hint: 'İleri tarihte yayına al' },
        { v: 'PUBLISHED', label: 'Yayına Al', hint: 'Hemen yayınla' },
      ]
    : [
        { v: 'DRAFT', label: 'Taslak', hint: 'Sitede görünmez' },
        { v: 'PENDING_REVIEW', label: 'Onaya Gönder', hint: 'Super Admin onayına gönder' },
      ];

  return (
    <div>
      <label className="block text-sm font-semibold text-zinc-100 tracking-tight mb-1">
        Durum
      </label>
      <div
        role="radiogroup"
        aria-label="Yayın durumu"
        className={`grid gap-1 p-1 bg-zinc-950 border border-zinc-800 rounded-lg ${
          canPublish ? 'grid-cols-3' : 'grid-cols-2'
        }`}
      >
        {options.map((opt) => {
          const active = status === opt.v;
          return (
            <button
              key={opt.v}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(opt.v)}
              title={opt.hint}
              className={`px-2 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
                active
                  ? 'bg-white text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      {status === 'SCHEDULED' && (
        <div className="mt-2 flex items-start gap-2">
          <div className="flex-shrink-0 w-8 h-8 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400 flex items-center justify-center text-sm mt-0.5">
            ◷
          </div>
          <div className="flex-1">
            <input
              type="datetime-local"
              value={scheduledFor}
              onChange={(e) => onScheduledForChange(e.target.value)}
              min={toDatetimeLocalValue(new Date())}
              required
              className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 focus:border-zinc-500 rounded-md outline-none text-zinc-100 text-sm focus:ring-zinc-500/20 focus:ring-2"
            />
            <p className="text-[10px] text-zinc-500 mt-1">
              Bu saatten itibaren site otomatik yayına alır.
            </p>
          </div>
        </div>
      )}
      {status === 'PENDING_REVIEW' && (
        <p className="mt-2 text-[11px] text-zinc-300 px-3 py-2 bg-zinc-900/40 border border-zinc-800 rounded-md">
          Makale kaydedildiğinde Super Admin&apos;in onay kuyruğuna düşer. Onaylanırsa otomatik yayına alınır.
        </p>
      )}
    </div>
  );
}
