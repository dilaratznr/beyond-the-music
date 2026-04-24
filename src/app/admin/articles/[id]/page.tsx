'use client';

import { use, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useToast } from '@/components/admin/Toast';
import DeleteButton from '@/components/admin/DeleteButton';
import ImageUploader from '@/components/admin/ImageUploader';
import { ARTICLE_CATEGORIES } from '@/lib/article-categories';
import { FormSkeleton } from '@/components/admin/Loading';
import { toDatetimeLocalValue } from '@/lib/datetime-local';

const RichEditor = dynamic(() => import('@/components/admin/RichEditor'), { ssr: false });

type Status = 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'PENDING_REVIEW';

function defaultScheduledFor(): string {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return toDatetimeLocalValue(d);
}

export default function EditArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { toast } = useToast();

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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [initialStatus, setInitialStatus] = useState<Status>('DRAFT');
  const [canPublish, setCanPublish] = useState<boolean>(false);
  // Son red edilmiş review notu — makale DRAFT'a alındıysa editöre
  // neden reddedildiği gösterilsin.
  const [lastRejection, setLastRejection] = useState<{
    reviewNote: string | null;
    reviewedAt: string | null;
    reviewedBy: { name: string } | null;
  } | null>(null);

  // --- Auto-save state ---
  // Baseline = what's currently persisted on the server. We diff the live form
  // against this JSON snapshot to decide whether we're "dirty". Kept as a ref
  // (not state) because changing it shouldn't trigger a re-render.
  const baselineRef = useRef<string>('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autosavingRef = useRef(false);
  const [autosaveStatus, setAutosaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [autosaveTick, setAutosaveTick] = useState(0); // re-render every minute for relative time

  // Kullanıcının ARTICLE yayın yetkisi var mı? Yoksa "Onaya Gönder"
  // akışına girer.
  useEffect(() => {
    fetch('/api/users/me')
      .then((r) => r.json())
      .then((d) => {
        const cp = d?.isSuperAdmin || d?.sections?.ARTICLE?.canPublish;
        setCanPublish(!!cp);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    Promise.all([
      fetch(`/api/articles/${id}`).then((r) => r.json()),
      fetch('/api/genres?all=true').then((r) => r.json()),
      fetch('/api/artists?all=true').then((r) => r.json()),
    ])
      .then(([article, genresList, artistsList]) => {
        if (article?.error) {
          setError(article.error);
        } else {
          const status: Status = (article.status || 'DRAFT') as Status;
          const loaded = {
            titleTr: article.titleTr || '',
            titleEn: article.titleEn || '',
            contentTr: article.contentTr || '',
            contentEn: article.contentEn || '',
            category: article.category || 'GENRE',
            status,
            // Prefill the scheduler with the server's stored publish time if this
            // article is already scheduled, otherwise leave it blank.
            scheduledFor:
              status === 'SCHEDULED' && article.publishedAt
                ? toDatetimeLocalValue(article.publishedAt)
                : '',
            featuredImage: article.featuredImage || '',
            relatedGenreId: article.relatedGenreId || '',
            relatedArtistId: article.relatedArtistId || '',
          };
          setForm(loaded);
          setInitialStatus(status);
          // Establish the baseline for autosave diffing once the form is hydrated.
          baselineRef.current = JSON.stringify(loaded);
          // Son red edilen review varsa kaydet — form başlığı DRAFT
          // ise UI'da görünür (aksi halde yayındaki makalede gereksiz
          // uyarı çıkmasın).
          if (article.lastRejection) {
            setLastRejection(article.lastRejection);
          }
        }
        setGenres(Array.isArray(genresList) ? genresList : []);
        setArtists(Array.isArray(artistsList) ? artistsList : []);
      })
      .finally(() => setLoading(false));
  }, [id]);

  // --- Auto-save effect ---
  // Whenever the form changes and differs from the baseline, schedule a save
  // 30 seconds out. Any further change resets the timer (debounce). The save
  // pins the article's status to whatever's currently persisted, so we never
  // accidentally publish or unpublish in the background.
  useEffect(() => {
    if (loading || saving) return;
    const snapshot = JSON.stringify(form);
    if (snapshot === baselineRef.current) {
      // Nothing to save; clear any pending timer.
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      if (autosavingRef.current) return;
      autosavingRef.current = true;
      setAutosaveStatus('saving');
      try {
        const res = await fetch(`/api/articles/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...form,
            // Force the persisted status — autosave never publishes/unpublishes.
            status: initialStatus,
            scheduledFor: initialStatus === 'SCHEDULED' ? form.scheduledFor : null,
            featuredImage: form.featuredImage || null,
            relatedGenreId: form.relatedGenreId || null,
            relatedArtistId: form.relatedArtistId || null,
          }),
        });
        if (!res.ok) throw new Error('autosave failed');
        baselineRef.current = JSON.stringify(form);
        setLastSavedAt(new Date());
        setAutosaveStatus('saved');
      } catch {
        setAutosaveStatus('error');
      } finally {
        autosavingRef.current = false;
      }
    }, 30_000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [form, id, initialStatus, loading, saving]);

  // Tick once a minute so the "X dakika önce" label refreshes without input.
  useEffect(() => {
    if (!lastSavedAt) return;
    const t = setInterval(() => setAutosaveTick((x) => x + 1), 60_000);
    return () => clearInterval(t);
  }, [lastSavedAt]);

  // Warn before leaving if there's an unsaved change pending the autosave timer.
  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      const dirty = JSON.stringify(form) !== baselineRef.current;
      if (dirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    }
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [form]);

  function updateStatus(next: Status) {
    setForm((f) => ({
      ...f,
      status: next,
      scheduledFor:
        next === 'SCHEDULED' && !f.scheduledFor ? defaultScheduledFor() : f.scheduledFor,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (initialStatus !== 'PUBLISHED' && form.status === 'PUBLISHED') {
      const ok = window.confirm(
        `"${form.titleTr}" makalesini yayına almak istediğinizden emin misiniz? Makale siteye anında yansıyacak.`,
      );
      if (!ok) return;
    } else if (initialStatus === 'PUBLISHED' && form.status === 'DRAFT') {
      const ok = window.confirm(
        `"${form.titleTr}" yayından kaldırılıp taslağa çekilecek. Devam edilsin mi?`,
      );
      if (!ok) return;
    }

    if (form.status === 'SCHEDULED' && !form.scheduledFor) {
      setError('Zamanlanmış yayın için bir tarih/saat seç.');
      return;
    }

    setSaving(true);
    setError('');
    const res = await fetch(`/api/articles/${id}`, {
      method: 'PUT',
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
    setSaving(false);
    if (!res.ok) {
      setError(data.error || 'Güncellenemedi');
      toast(data.error || 'Güncellenemedi', 'error');
    } else {
      toast(
        form.status === 'SCHEDULED'
          ? 'Makale zamanlandı'
          : form.status === 'PUBLISHED'
            ? 'Makale güncellendi'
            : 'Taslak kaydedildi',
      );
      router.push('/admin/articles');
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl">
        <div className="mb-5">
          <div className="h-5 w-44 bg-zinc-800/60 rounded-md animate-pulse mb-2" />
          <div className="h-3 w-60 bg-zinc-800/60 rounded animate-pulse" />
        </div>
        <FormSkeleton />
      </div>
    );
  }

  const saveLabel =
    form.status === 'PUBLISHED'
      ? initialStatus === 'PUBLISHED'
        ? 'Güncelle'
        : 'Yayına Al'
      : form.status === 'SCHEDULED'
        ? 'Yayın Zamanla'
        : 'Taslağı Kaydet';

  // Touch autosaveTick so this render is recomputed once a minute — keeps the
  // "X dakika önce" label fresh without requiring form input.
  void autosaveTick;
  const autosaveLabel = renderAutosaveLabel(autosaveStatus, lastSavedAt);

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">Makale Düzenle</h1>
          {autosaveLabel && (
            <span
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border ${autosaveLabel.className}`}
              title={autosaveLabel.title}
            >
              {autosaveLabel.icon}
              {autosaveLabel.text}
            </span>
          )}
        </div>
        <div className="flex gap-2 items-center">
          <Link href="/admin/articles" className="text-zinc-500 hover:text-zinc-100 text-sm">← Geri</Link>
          <DeleteButton
            endpoint={`/api/articles/${id}`}
            confirmMessage={`"${form.titleTr}" makalesini silmek istediğinizden emin misiniz?`}
            onDeleted={() => router.push('/admin/articles')}
          />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-300 text-sm rounded-lg">{error}</div>}

        {/* Son red edilmiş review varsa editöre net bir geri bildirim
            olarak gösterilir. Yalnızca makale şu an DRAFT'ta iken mantıklı —
            yayınlandıysa zaten geride kalmış bir reddetme, ilgisiz. */}
        {lastRejection && initialStatus === 'DRAFT' && (
          <div className="p-4 rounded-lg border border-zinc-800 bg-zinc-900/40">
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 mt-0.5 text-zinc-500 text-[14px]" aria-hidden="true">●</span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] uppercase tracking-wider font-semibold text-zinc-400">
                  Son gönderin reddedildi
                </p>
                {lastRejection.reviewNote ? (
                  <p className="text-sm text-zinc-200 mt-2 leading-relaxed">
                    {lastRejection.reviewNote}
                  </p>
                ) : (
                  <p className="text-sm text-zinc-500 mt-2 italic">
                    Red notu bırakılmadı.
                  </p>
                )}
                {lastRejection.reviewedBy && lastRejection.reviewedAt && (
                  <p className="text-[10px] text-zinc-500 mt-2">
                    {lastRejection.reviewedBy.name} ·{' '}
                    {new Date(lastRejection.reviewedAt).toLocaleString('tr-TR')}
                  </p>
                )}
                <p className="text-[11px] text-zinc-400 mt-3">
                  Gerekli düzenlemeleri yapıp tekrar &quot;Onaya Gönder&quot; diyebilirsin.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-zinc-900/40 p-6 rounded-lg border border-zinc-800 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="art-cat" className="block text-sm font-semibold text-zinc-100 tracking-tight mb-1">Kategori</label>
              <select id="art-cat" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 focus:border-zinc-500 rounded-lg outline-none text-zinc-100 focus:ring-zinc-500/20 focus:ring-2">
                {ARTICLE_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.labelTr}</option>)}
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
              <label htmlFor="art-genre" className="block text-sm font-semibold text-zinc-100 tracking-tight mb-1">İlgili Tür</label>
              <select id="art-genre" value={form.relatedGenreId} onChange={(e) => setForm({ ...form, relatedGenreId: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 focus:border-zinc-500 rounded-lg outline-none text-zinc-100 focus:ring-zinc-500/20 focus:ring-2">
                <option value="">Yok</option>
                {genres.map((g) => <option key={g.id} value={g.id}>{g.nameTr}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="art-artist" className="block text-sm font-semibold text-zinc-100 tracking-tight mb-1">İlgili Sanatçı</label>
              <select id="art-artist" value={form.relatedArtistId} onChange={(e) => setForm({ ...form, relatedArtistId: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 focus:border-zinc-500 rounded-lg outline-none text-zinc-100 focus:ring-zinc-500/20 focus:ring-2">
                <option value="">Yok</option>
                {artists.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="bg-zinc-900/40 rounded-lg border border-zinc-800 overflow-hidden">
          <div className="flex border-b border-zinc-800">
            <button type="button" onClick={() => setActiveTab('tr')}
              className={`flex-1 py-3 text-sm font-medium ${activeTab === 'tr' ? 'bg-white text-zinc-950' : 'text-zinc-300 hover:bg-zinc-800'}`}>
              Türkçe
            </button>
            <button type="button" onClick={() => setActiveTab('en')}
              className={`flex-1 py-3 text-sm font-medium ${activeTab === 'en' ? 'bg-white text-zinc-950' : 'text-zinc-300 hover:bg-zinc-800'}`}>
              English
            </button>
          </div>
          <div className="p-6 space-y-4">
            {activeTab === 'tr' ? (
              <>
                <div>
                  <label htmlFor="art-title-tr" className="block text-sm font-semibold text-zinc-100 tracking-tight mb-1">Başlık (TR)</label>
                  <input id="art-title-tr" type="text" value={form.titleTr} onChange={(e) => setForm({ ...form, titleTr: e.target.value })}
                    className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 focus:border-zinc-500 rounded-lg outline-none text-zinc-100 text-lg placeholder:text-zinc-600 focus:ring-zinc-500/20 focus:ring-2" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">İçerik (TR)</label>
                  <RichEditor content={form.contentTr} onChange={(v) => setForm({ ...form, contentTr: v })} placeholder="Türkçe içerik yazın..." />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label htmlFor="art-title-en" className="block text-sm font-semibold text-zinc-100 tracking-tight mb-1">Title (EN)</label>
                  <input id="art-title-en" type="text" value={form.titleEn} onChange={(e) => setForm({ ...form, titleEn: e.target.value })}
                    className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 focus:border-zinc-500 rounded-lg outline-none text-zinc-100 text-lg placeholder:text-zinc-600 focus:ring-zinc-500/20 focus:ring-2" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Content (EN)</label>
                  <RichEditor content={form.contentEn} onChange={(v) => setForm({ ...form, contentEn: v })} placeholder="Write English content..." />
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
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-white text-zinc-950 text-[12px] font-semibold rounded-md hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? (
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

function renderAutosaveLabel(
  status: 'idle' | 'saving' | 'saved' | 'error',
  lastSavedAt: Date | null,
): { text: string; icon: React.ReactNode; className: string; title: string } | null {
  if (status === 'saving') {
    return {
      text: 'Kaydediliyor…',
      icon: (
        <svg className="animate-spin" width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
          <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      ),
      className: 'bg-sky-500/10 text-sky-300 border-sky-500/30',
      title: 'Otomatik kaydediliyor',
    };
  }
  if (status === 'error') {
    return {
      text: 'Kaydedilemedi',
      icon: <span aria-hidden="true">!</span>,
      className: 'bg-red-500/10 text-red-300 border-red-500/30',
      title: 'Otomatik kayıt başarısız oldu — Kaydet tuşuna basmayı deneyin',
    };
  }
  if (status === 'saved' && lastSavedAt) {
    return {
      text: `Kaydedildi · ${formatRelativeTime(lastSavedAt)}`,
      icon: (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 13l4 4L19 7" />
        </svg>
      ),
      className: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
      title: `Son otomatik kayıt: ${lastSavedAt.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`,
    };
  }
  return null;
}

function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.round(diffMs / 1000);
  if (diffSec < 60) return 'şimdi';
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin} dk önce`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `${diffH} sa önce`;
  return date.toLocaleDateString('tr-TR');
}

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
  /** Bkz. new/page.tsx StatusSelector — canPublish yoksa "Onaya Gönder" modu. */
  canPublish: boolean;
}) {
  // PENDING_REVIEW durumunda açılan sayfada admin bu durumu manuel
  // olarak göremese bile, review reddedildiğinde status DRAFT'a çekilir —
  // yani form başlangıç status'u hiçbir zaman PENDING_REVIEW olmaz.
  // Ama super admin onay ekranından buraya dönebildiğinde görünür olsun
  // diye yine de enumda tutuyoruz.
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
          <div className="flex-shrink-0 w-8 h-8 rounded-md bg-sky-500/10 text-sky-300 flex items-center justify-center text-sm mt-0.5">
            ◷
          </div>
          <div className="flex-1">
            <input
              type="datetime-local"
              value={scheduledFor}
              onChange={(e) => onScheduledForChange(e.target.value)}
              min={toDatetimeLocalValue(new Date())}
              required
              className="w-full px-3 py-1.5 bg-zinc-950 border border-sky-500/30 hover:border-sky-500/60 focus:border-sky-400 rounded-md outline-none text-zinc-100 text-sm focus:ring-sky-500/20 focus:ring-2"
            />
            <p className="text-[10px] text-zinc-500 mt-1">
              Bu saatten itibaren site otomatik yayına alır.
            </p>
          </div>
        </div>
      )}
      {status === 'PENDING_REVIEW' && (
        <p className="mt-2 text-[11px] text-amber-300 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-md">
          Kaydettiğinde Super Admin&apos;in onay kuyruğuna düşer. Onaylanırsa otomatik yayına alınır.
        </p>
      )}
    </div>
  );
}
