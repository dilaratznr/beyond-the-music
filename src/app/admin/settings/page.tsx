'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useToast } from '@/components/admin/Toast';
import ImageUploader from '@/components/admin/ImageUploader';
import {
  FieldLabel,
  FieldHelp,
  TextInput,
  TextArea,
  FormError,
} from '@/components/admin/FormField';
import { IconExternal } from '@/components/admin/Icons';
import { SettingsSkeleton } from '@/components/admin/Loading';
import {
  FONT_OPTIONS,
  DEFAULT_BODY_FONT,
  DEFAULT_DISPLAY_FONT,
  getFontFamilyCss,
  type FontCategory,
} from '@/lib/site-fonts';
import type { FontFamily } from '@/app/fonts';

type Settings = Record<string, string>;
type Lang = 'tr' | 'en';

// Keys must match PUBLIC_SECTIONS in src/lib/site-sections.ts
const SECTION_TOGGLES: Array<{ key: string; labelTr: string; labelEn: string }> = [
  { key: 'section_genre_enabled', labelTr: 'Tür', labelEn: 'Genre' },
  { key: 'section_artist_enabled', labelTr: 'Sanatçı', labelEn: 'Artist' },
  { key: 'section_architects_enabled', labelTr: 'Mimarlar', labelEn: 'Architects' },
  { key: 'section_theory_enabled', labelTr: 'Teori', labelEn: 'Theory' },
  { key: 'section_listening_paths_enabled', labelTr: 'Dinleme Rotaları', labelEn: 'Listening Paths' },
  { key: 'section_ai_music_enabled', labelTr: 'AI Müzik', labelEn: 'AI Music' },
];

export default function SettingsPage() {
  const { data: session } = useSession();
  const isSuperAdmin = session?.user?.role === 'SUPER_ADMIN';
  const { toast } = useToast();

  const [settings, setSettings] = useState<Settings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [dirty, setDirty] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [lang, setLang] = useState<Lang>('tr');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data: Settings) => {
        if (cancelled) return;
        setSettings(data || {});
        setLoading(false);
        setDirty(false);
      })
      .catch(() => {
        if (!cancelled) {
          setLoading(false);
          setError('Ayarlar yüklenemedi');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const update = useCallback((key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  }, []);

  const toggleSection = useCallback(
    (key: string) => {
      const current = settings[key] !== 'false';
      update(key, current ? 'false' : 'true');
    },
    [settings, update]
  );

  async function handleSave(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!isSuperAdmin) {
      toast('Sadece Super Admin kaydedebilir', 'error');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Kaydetme hatası');
        toast(data.error || 'Kaydetme hatası', 'error');
      } else {
        toast('Ayarlar kaydedildi');
        setDirty(false);
        setReloadToken((t) => t + 1);
      }
    } catch {
      setError('Kaydetme hatası');
      toast('Kaydetme hatası', 'error');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl">
        <div className="mb-5">
          <div className="h-5 w-36 bg-zinc-800/60 rounded-md animate-pulse mb-2" />
          <div className="h-3 w-72 bg-zinc-800/60 rounded animate-pulse" />
        </div>
        <SettingsSkeleton />
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">Site Ayarları</h1>
          <p className="text-[13px] text-zinc-500 mt-1">
            Public sitenin ana sayfasında görünen içerikler. Değişiklikler kaydedildikten sonra
            siteye yansır.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/${lang}`}
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 hover:border-zinc-700 rounded-md text-xs font-medium transition-colors"
          >
            <IconExternal size={12} />
            <span>Sitede Gör</span>
          </Link>
          <button
            type="button"
            onClick={() => handleSave()}
            disabled={saving || !dirty || !isSuperAdmin}
            className="px-4 py-1.5 bg-white text-zinc-950 rounded-md text-xs font-semibold hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </div>
      </div>

      {/* Language switcher — single source of truth for which translation is being edited */}
      <div className="flex items-center gap-3 mb-5 px-4 py-2.5 bg-zinc-900/40 rounded-lg border border-zinc-800">
        <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
          Düzenlenen Dil
        </span>
        <div className="inline-flex bg-zinc-950 border border-zinc-800 rounded-md p-0.5">
          <LangTab active={lang === 'tr'} onClick={() => setLang('tr')} flag="🇹🇷" label="Türkçe" />
          <LangTab active={lang === 'en'} onClick={() => setLang('en')} flag="🇬🇧" label="English" />
        </div>
        <span className="text-[11px] text-zinc-500 ml-auto hidden sm:inline">
          Diğer dile geçtiğinizde değişiklikleriniz korunur.
        </span>
      </div>

      {error && (
        <div className="mb-4">
          <FormError>{error}</FormError>
        </div>
      )}

      {!isSuperAdmin && (
        <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs rounded-md">
          Sadece Super Admin kullanıcılar site ayarlarını değiştirebilir. Değişiklikleriniz
          kaydedilmeyecek.
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5">
        {/* ── Hero Section ──────────────────────────────────── */}
        <SettingsCard
          title="Ana Sayfa · Karşılama Bölümü"
          description="Sitenin açılış sahnesi: arka planda video, üstte büyük başlık ve iki buton."
          badge="Ana sayfa üst"
        >
          <LocalizedField
            baseKey="hero_subtitle"
            label="Üst Etiket"
            lang={lang}
            settings={settings}
            update={update}
            placeholderTr="örn. Müzik Platformu"
            placeholderEn="e.g. Music Platform"
            help="Başlığın üstünde küçük, büyük harfli bir satır olarak görünür."
          />

          <LocalizedField
            baseKey="hero_title"
            label="Ana Başlık"
            lang={lang}
            settings={settings}
            update={update}
            placeholderTr="örn. BEYOND THE MUSIC"
            placeholderEn="e.g. BEYOND THE MUSIC"
            help="Sayfanın en büyük başlığı (font-editorial)."
          />

          <LocalizedTextArea
            baseKey="hero_desc"
            label="Açıklama"
            lang={lang}
            settings={settings}
            update={update}
            rows={3}
            placeholderTr="Müziğin ötesindeki kültürü keşfet.&#10;Türler, sanatçılar, hikayeler."
            placeholderEn="Discover the culture beyond music."
            help="Başlığın altındaki kısa tanıtım metni. Yeni satır için Enter."
          />

          <div className="grid sm:grid-cols-2 gap-4">
            <LocalizedField
              baseKey="hero_cta_text"
              label="Ana Buton Metni"
              lang={lang}
              settings={settings}
              update={update}
              placeholderTr="örn. Keşfet"
              placeholderEn="e.g. Explore"
              help="Beyaz dolgu buton · Türler sayfasına gider."
            />
            <LocalizedField
              baseKey="hero_cta2_text"
              label="İkinci Buton Metni"
              lang={lang}
              settings={settings}
              update={update}
              placeholderTr="örn. Dinleme Rotaları"
              placeholderEn="e.g. Listening Paths"
              help="Saydam çerçeveli buton · Dinleme rotalarına gider."
            />
          </div>

          <div className="flex items-start gap-2 px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-md">
            <span className="text-zinc-500 text-xs mt-0.5">›</span>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Hero bölümünün arka planındaki <strong className="text-zinc-200">video ve görseli</strong>{' '}
              yönetmek için{' '}
              <Link
                href="/admin/hero-videos"
                className="text-zinc-200 font-medium underline decoration-dotted underline-offset-2 hover:text-white"
              >
                Hero Videoları
              </Link>{' '}
              sayfasını kullan.
            </p>
          </div>
        </SettingsCard>

        {/* ── Culture Banner ────────────────────────────────── */}
        <SettingsCard
          title="Ana Sayfa · Kültür Bandı"
          description='Sayfanın altındaki parallax bölüm ("Fashion · Music · Culture").'
          badge="Ana sayfa alt"
        >
          <LocalizedTextArea
            baseKey="culture_banner_title"
            label="Başlık"
            lang={lang}
            settings={settings}
            update={update}
            rows={2}
            placeholderTr="örn. Müzik Sadece Dinlenmez,&#10;Yaşanır"
            placeholderEn="e.g. Music isn't just heard,&#10;it's lived"
            help="Yeni satır için Enter. Büyük serif başlık olarak görünür."
          />

          <LocalizedTextArea
            baseKey="culture_banner_desc"
            label="Açıklama"
            lang={lang}
            settings={settings}
            update={update}
            rows={2}
          />

          <SharedFieldsDivider />

          <div className="max-w-md">
            <ImageUploader
              value={settings.culture_banner_image || ''}
              onChange={(url) => update('culture_banner_image', url || '')}
              category="other"
              aspect="wide"
              label="Arka Plan Görseli"
              helperText="Geniş oran · parlaklık zaten %15'e düşürülür"
            />
          </div>
        </SettingsCard>

        {/* ── Logo & Branding (Super Admin only) ────────────── */}
        {isSuperAdmin && (
          <SettingsCard
            title="Logo ve Marka"
            description="Sitede her sayfanın üstünde (Navbar) ve altında (Footer) görünen logo ve site adı. Boş bırakılan alanlar için 🎧 emoji + 'Beyond The Music' fallback'i kullanılır."
            badge="Sadece Super Admin"
          >
            <div>
              <FieldLabel htmlFor="site-name">Site Adı</FieldLabel>
              <TextInput
                id="site-name"
                value={settings.site_name || ''}
                onChange={(v) => update('site_name', v)}
                placeholder="Beyond The Music"
              />
              <FieldHelp>
                Logonun yanında / altında görünen metin. Logo yüklenmediğinde tek başına gösterilir.
                Boş bırakılırsa varsayılan &quot;Beyond The Music&quot; kullanılır.
              </FieldHelp>
            </div>

            <SharedFieldsDivider />

            <div className="grid sm:grid-cols-2 gap-5">
              <ImageUploader
                value={settings.site_logo_url || ''}
                onChange={(url) => update('site_logo_url', url || '')}
                category="logo"
                aspect="wide"
                label="Ana Logo (Header)"
                helperText="Koyu arka plan üzerinde okunabilir olmalı — beyaz/açık renkli logo tercih edin. Navbar yüksekliğine (56 px) ölçeklenir."
              />
              <ImageUploader
                value={settings.site_logo_footer_url || ''}
                onChange={(url) => update('site_logo_footer_url', url || '')}
                category="logo"
                aspect="wide"
                label="Footer Logosu (opsiyonel)"
                helperText="Footer için ayrı logo. Boş bırakılırsa Navbar logosu kullanılır."
              />
            </div>
          </SettingsCard>
        )}

        {/* ── Typography (Super Admin only) ─────────────────── */}
        {isSuperAdmin && (
          <SettingsCard
            title="Tipografi"
            description="Sitede kullanılan gövde ve başlık yazı tipleri. Değişiklik kaydedildiğinde tüm public site anında yeni fontla yüklenir."
            badge="Sadece Super Admin"
          >
            <TypographyPicker settings={settings} update={update} />
          </SettingsCard>
        )}

        {/* ── Site Sections (Super Admin only) ──────────────── */}
        {isSuperAdmin && (
          <SettingsCard
            title="Site Bölümleri"
            description="Public menüde görünen bölümleri aç/kapat. Kapatılan bölümler menüden kaldırılır ve URL ile açılsa 404 döner."
            badge="Sadece Super Admin"
          >
            <div className="space-y-1">
              {SECTION_TOGGLES.map((s) => {
                const on = settings[s.key] !== 'false';
                return (
                  <div
                    key={s.key}
                    className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-zinc-800/40 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-zinc-100">{s.labelTr}</div>
                      <div className="text-[10px] text-zinc-500">
                        {s.labelEn} · <code className="text-zinc-500">{s.key}</code>
                      </div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={on}
                      aria-label={`${s.labelTr} ${on ? 'açık' : 'kapalı'}`}
                      onClick={() => toggleSection(s.key)}
                      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-500/40 focus:ring-offset-2 focus:ring-offset-zinc-950 ${
                        on ? 'bg-emerald-500' : 'bg-zinc-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                          on ? 'translate-x-5' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          </SettingsCard>
        )}

        {/* ── Custom nav links (Super Admin only) ────────────── */}
        {isSuperAdmin && (
          <SettingsCard
            title="Özel Menü Linkleri"
            description="Public menüye serbest link ekleyin (ör. Podcast, Röportajlar, dış bağlantı). Göreceli yol yazarsanız aktif dile göre yönlendirilir; http(s):// ile başlayan bağlantılar yeni sekmede açılır."
            badge="Sadece Super Admin"
          >
            <CustomNavEditor
              value={settings.nav_custom_items || ''}
              onChange={(json) => update('nav_custom_items', json)}
            />
          </SettingsCard>
        )}

        {/* Footer actions */}
        <div className="bg-zinc-900/40 rounded-lg border border-zinc-800 px-5 py-4 flex items-center justify-between gap-3">
          <p className="text-[11px] text-zinc-500">
            {dirty ? (
              <span className="inline-flex items-center gap-1.5 text-amber-300">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" aria-hidden="true" />
                Kaydedilmemiş değişiklikler var
              </span>
            ) : (
              'Tüm değişiklikler kaydedildi.'
            )}
          </p>
          <button
            type="submit"
            disabled={saving || !dirty || !isSuperAdmin}
            className="px-5 py-2 bg-white text-zinc-950 rounded-md text-xs font-semibold hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Kaydediliyor…' : 'Tümünü Kaydet'}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
 * Local presentational helpers (top-level to satisfy React 19 rules)
 * ────────────────────────────────────────────────────────────── */

function LangTab({
  active,
  onClick,
  flag,
  label,
}: {
  active: boolean;
  onClick: () => void;
  flag: string;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition-all ${
        active
          ? 'bg-white text-zinc-950'
          : 'text-zinc-400 hover:text-zinc-100'
      }`}
      aria-pressed={active}
    >
      <span aria-hidden="true">{flag}</span>
      <span>{label}</span>
    </button>
  );
}

function SettingsCard({
  title,
  description,
  badge,
  children,
}: {
  title: string;
  description?: string;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-zinc-900/40 rounded-lg border border-zinc-800 overflow-hidden">
      <header className="px-5 py-3.5 bg-zinc-900/60 border-b border-zinc-800 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-100 tracking-tight">{title}</h2>
          {description && <p className="text-[11px] text-zinc-500 mt-0.5">{description}</p>}
        </div>
        {badge && (
          <span className="flex-shrink-0 text-[9px] uppercase tracking-wider font-semibold text-zinc-400 bg-zinc-950 border border-zinc-800 rounded-full px-2 py-0.5">
            {badge}
          </span>
        )}
      </header>
      <div className="p-5 space-y-5">{children}</div>
    </section>
  );
}

function SharedFieldsDivider() {
  return (
    <div className="flex items-center gap-3 pt-1">
      <div className="flex-1 h-px bg-zinc-800" />
      <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
        Dilden bağımsız alanlar
      </span>
      <div className="flex-1 h-px bg-zinc-800" />
    </div>
  );
}

function LocalizedField({
  baseKey,
  label,
  lang,
  settings,
  update,
  placeholderTr,
  placeholderEn,
  help,
}: {
  baseKey: string;
  label: string;
  lang: Lang;
  settings: Settings;
  update: (key: string, value: string) => void;
  placeholderTr?: string;
  placeholderEn?: string;
  help?: string;
}) {
  const key = `${baseKey}_${lang}`;
  return (
    <div>
      <FieldLabel htmlFor={key} hint={lang === 'tr' ? 'Türkçe' : 'English'}>
        {label}
      </FieldLabel>
      <TextInput
        id={key}
        value={settings[key] || ''}
        onChange={(v) => update(key, v)}
        placeholder={lang === 'tr' ? placeholderTr : placeholderEn}
      />
      {help && <FieldHelp>{help}</FieldHelp>}
    </div>
  );
}

/**
 * Typography picker: two selects (body + display) with a live preview.
 *
 * Every font offered here is already self-hosted at build time via
 * `next/font/google` (see `src/app/fonts.ts`). `getFontFamilyCss(family)`
 * returns the exact `font-family` value — including next/font's
 * metric-matched fallback — so the preview renders with the same fonts the
 * public site will, with zero network round-trips. We apply it inline so
 * only the preview card picks up the change, not the admin chrome.
 */
function TypographyPicker({
  settings,
  update,
}: {
  settings: Settings;
  update: (key: string, value: string) => void;
}) {
  // Narrow DB-stored strings to known families; anything unrecognised
  // (e.g. someone editing the DB by hand) falls back to the default so the
  // preview can still render without crashing.
  const narrow = (value: string | undefined, fallback: FontFamily): FontFamily =>
    (FONT_OPTIONS.find((f) => f.family === value)?.family ?? fallback) as FontFamily;
  const bodyValue = narrow(settings.site_font_body, DEFAULT_BODY_FONT);
  const displayValue = narrow(settings.site_font_display, DEFAULT_DISPLAY_FONT);

  const grouped: Record<FontCategory, typeof FONT_OPTIONS> = {
    sans: [],
    serif: [],
    display: [],
    mono: [],
  };
  for (const f of FONT_OPTIONS) grouped[f.category].push(f);

  const CATEGORY_LABEL: Record<FontCategory, string> = {
    sans: 'Sans',
    serif: 'Serif',
    display: 'Display',
    mono: 'Mono',
  };

  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <FieldLabel htmlFor="font-body">Gövde Fontu</FieldLabel>
          <select
            id="font-body"
            value={bodyValue}
            onChange={(e) => update('site_font_body', e.target.value)}
            className="w-full px-3 py-2 text-sm text-zinc-100 bg-zinc-950 border border-zinc-800 rounded-md outline-none transition-colors hover:border-zinc-700 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20"
            style={{ fontFamily: getFontFamilyCss(bodyValue) }}
          >
            {(Object.keys(grouped) as FontCategory[]).map((cat) => (
              <optgroup key={cat} label={CATEGORY_LABEL[cat]}>
                {grouped[cat].map((f) => (
                  <option key={f.family} value={f.family}>
                    {f.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <FieldHelp>Menü, metin, açıklamalar — sitenin çoğunluğunda kullanılan font.</FieldHelp>
        </div>

        <div>
          <FieldLabel htmlFor="font-display">Başlık Fontu</FieldLabel>
          <select
            id="font-display"
            value={displayValue}
            onChange={(e) => update('site_font_display', e.target.value)}
            className="w-full px-3 py-2 text-sm text-zinc-100 bg-zinc-950 border border-zinc-800 rounded-md outline-none transition-colors hover:border-zinc-700 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20"
            style={{ fontFamily: getFontFamilyCss(displayValue) }}
          >
            {(Object.keys(grouped) as FontCategory[]).map((cat) => (
              <optgroup key={cat} label={CATEGORY_LABEL[cat]}>
                {grouped[cat].map((f) => (
                  <option key={f.family} value={f.family}>
                    {f.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <FieldHelp>Hero başlığı, `font-editorial` ve prose h2 için — karakterli, geniş.</FieldHelp>
        </div>
      </div>

      {/* Live preview — dark card that mimics the public site's hero palette */}
      <div className="rounded-lg overflow-hidden border border-zinc-800">
        <div className="px-4 py-2 bg-zinc-900/60 border-b border-zinc-800 flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400">
            Canlı Önizleme
          </span>
          <span className="text-[10px] text-zinc-500">
            Public sitenin hero bölümünü taklit eder
          </span>
        </div>
        <div className="bg-[#0a0a0b] text-white p-7 space-y-4">
          <p
            className="text-[11px] uppercase tracking-[0.2em] text-zinc-500"
            style={{ fontFamily: getFontFamilyCss(bodyValue) }}
          >
            Müzik Platformu
          </p>
          <h3
            className="text-3xl md:text-4xl font-bold leading-none"
            style={{ fontFamily: getFontFamilyCss(displayValue), letterSpacing: '-0.03em' }}
          >
            BEYOND THE MUSIC
          </h3>
          <p
            className="text-sm text-zinc-400 max-w-md leading-relaxed"
            style={{ fontFamily: getFontFamilyCss(bodyValue) }}
          >
            Müziğin ötesindeki kültürü keşfet. Türler, sanatçılar, hikayeler ve müziğin arkasındaki
            mimarlar — tek bir akışta.
          </p>
          <div className="flex gap-2 pt-2">
            <span
              className="px-4 py-1.5 bg-white text-black rounded-full text-xs font-semibold"
              style={{ fontFamily: getFontFamilyCss(bodyValue) }}
            >
              Keşfet
            </span>
            <span
              className="px-4 py-1.5 border border-white/20 text-white rounded-full text-xs font-semibold"
              style={{ fontFamily: getFontFamilyCss(bodyValue) }}
            >
              Dinleme Rotaları
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function LocalizedTextArea({
  baseKey,
  label,
  lang,
  settings,
  update,
  rows = 3,
  placeholderTr,
  placeholderEn,
  help,
}: {
  baseKey: string;
  label: string;
  lang: Lang;
  settings: Settings;
  update: (key: string, value: string) => void;
  rows?: number;
  placeholderTr?: string;
  placeholderEn?: string;
  help?: string;
}) {
  const key = `${baseKey}_${lang}`;
  return (
    <div>
      <FieldLabel htmlFor={key} hint={lang === 'tr' ? 'Türkçe' : 'English'}>
        {label}
      </FieldLabel>
      <TextArea
        id={key}
        value={settings[key] || ''}
        onChange={(v) => update(key, v)}
        rows={rows}
        placeholder={lang === 'tr' ? placeholderTr : placeholderEn}
      />
      {help && <FieldHelp>{help}</FieldHelp>}
    </div>
  );
}

/**
 * Editor for super-admin-defined navbar links. Holds an array of
 * { id, labelTr, labelEn, href, enabled } items. Serializes back to
 * a JSON string via the parent's `update('nav_custom_items', json)`.
 *
 * Validation is intentionally light — empty rows are allowed during
 * editing and just filtered out at render time on the public nav.
 */
type NavItem = {
  id: string;
  labelTr: string;
  labelEn: string;
  href: string;
  enabled: boolean;
};

function parseItems(value: string): NavItem[] {
  if (!value) return [];
  try {
    const data = JSON.parse(value);
    if (!Array.isArray(data)) return [];
    return data.map((r) => ({
      id: typeof r?.id === 'string' && r.id ? r.id : makeId(),
      labelTr: typeof r?.labelTr === 'string' ? r.labelTr : '',
      labelEn: typeof r?.labelEn === 'string' ? r.labelEn : '',
      href: typeof r?.href === 'string' ? r.href : '',
      enabled: r?.enabled !== false,
    }));
  } catch {
    return [];
  }
}

function makeId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `nav_${crypto.randomUUID().slice(0, 8)}`;
  }
  return `nav_${Math.random().toString(36).slice(2, 10)}`;
}

const navInputCls =
  'w-full px-2.5 py-1.5 text-xs bg-zinc-950 border border-zinc-800 rounded-md text-zinc-100 placeholder:text-zinc-600 outline-none transition-colors hover:border-zinc-700 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20';

function CustomNavEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (json: string) => void;
}) {
  const items = parseItems(value);

  function commit(next: NavItem[]) {
    onChange(next.length ? JSON.stringify(next) : '');
  }

  function patch(id: string, partial: Partial<NavItem>) {
    commit(items.map((it) => (it.id === id ? { ...it, ...partial } : it)));
  }

  function add() {
    commit([
      ...items,
      { id: makeId(), labelTr: '', labelEn: '', href: '', enabled: true },
    ]);
  }

  function remove(id: string) {
    commit(items.filter((it) => it.id !== id));
  }

  function move(id: string, dir: -1 | 1) {
    const idx = items.findIndex((it) => it.id === id);
    const target = idx + dir;
    if (idx < 0 || target < 0 || target >= items.length) return;
    const next = items.slice();
    [next[idx], next[target]] = [next[target], next[idx]];
    commit(next);
  }

  return (
    <div className="space-y-3">
      {items.length === 0 ? (
        <div className="px-4 py-6 bg-zinc-950 border border-dashed border-zinc-800 rounded-md text-center">
          <p className="text-[12px] text-zinc-500">
            Henüz özel link eklenmemiş. Aşağıdaki butonla ekleyin.
          </p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {items.map((it, i) => (
            <li
              key={it.id}
              className="bg-zinc-950 border border-zinc-800 rounded-md p-3 space-y-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500 w-6">
                    #{i + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => move(it.id, -1)}
                    disabled={i === 0}
                    aria-label="Yukarı taşı"
                    className="w-6 h-6 flex items-center justify-center rounded text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <span aria-hidden="true">↑</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => move(it.id, 1)}
                    disabled={i === items.length - 1}
                    aria-label="Aşağı taşı"
                    className="w-6 h-6 flex items-center justify-center rounded text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <span aria-hidden="true">↓</span>
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={it.enabled}
                    aria-label={it.enabled ? 'Kapat' : 'Aç'}
                    onClick={() => patch(it.id, { enabled: !it.enabled })}
                    className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-500/40 focus:ring-offset-2 focus:ring-offset-zinc-950 ${
                      it.enabled ? 'bg-emerald-500' : 'bg-zinc-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        it.enabled ? 'translate-x-4' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(it.id)}
                    aria-label="Linki sil"
                    className="text-[11px] font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 px-2 py-1 rounded transition-colors"
                  >
                    Sil
                  </button>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-2.5">
                <div>
                  <label
                    htmlFor={`nav-tr-${it.id}`}
                    className="block text-[10px] font-semibold text-zinc-500 mb-1 uppercase tracking-wider"
                  >
                    Etiket (TR)
                  </label>
                  <input
                    id={`nav-tr-${it.id}`}
                    type="text"
                    value={it.labelTr}
                    onChange={(e) => patch(it.id, { labelTr: e.target.value })}
                    placeholder="örn. Podcast"
                    maxLength={40}
                    className={navInputCls}
                  />
                </div>
                <div>
                  <label
                    htmlFor={`nav-en-${it.id}`}
                    className="block text-[10px] font-semibold text-zinc-500 mb-1 uppercase tracking-wider"
                  >
                    Etiket (EN)
                  </label>
                  <input
                    id={`nav-en-${it.id}`}
                    type="text"
                    value={it.labelEn}
                    onChange={(e) => patch(it.id, { labelEn: e.target.value })}
                    placeholder="e.g. Podcast"
                    maxLength={40}
                    className={navInputCls}
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor={`nav-href-${it.id}`}
                  className="block text-[10px] font-semibold text-zinc-500 mb-1 uppercase tracking-wider"
                >
                  Bağlantı
                </label>
                <input
                  id={`nav-href-${it.id}`}
                  type="text"
                  value={it.href}
                  onChange={(e) => patch(it.id, { href: e.target.value })}
                  placeholder="/listening-paths  veya  https://example.com"
                  maxLength={300}
                  className={navInputCls}
                  spellCheck={false}
                />
                <p className="text-[10px] text-zinc-600 mt-1">
                  Site içi yol için <code className="text-zinc-400">/yol</code> · dış bağlantı için{' '}
                  <code className="text-zinc-400">https://…</code> (yeni sekmede açılır).
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={add}
        className="w-full px-3 py-2 bg-zinc-900 border border-dashed border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800/60 text-zinc-300 hover:text-white text-xs font-semibold rounded-md transition-colors"
      >
        + Yeni Link Ekle
      </button>
    </div>
  );
}
