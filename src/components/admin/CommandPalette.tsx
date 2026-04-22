'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import {
  IconArtist,
  IconAlbum,
  IconSong,
  IconArticle,
  IconArchitect,
  IconGenre,
  IconPath,
  IconDashboard,
  IconPlus,
  IconSettings,
  IconUsers,
  IconVideo,
} from './Icons';

type Kind =
  | 'article'
  | 'artist'
  | 'album'
  | 'song'
  | 'architect'
  | 'genre'
  | 'path';

interface Hit {
  kind: Kind;
  id: string;
  title: string;
  image: string | null;
  sub: string;
  href: string;
}

interface Shortcut {
  id: string;
  label: string;
  sub: string;
  href: string;
  icon: ReactNode;
}

/**
 * When the editor has typed nothing, offer a curated list of common
 * destinations (dashboard + section lists) and creation shortcuts.
 * These are always visible until the first keystroke.
 */
const SHORTCUTS: Shortcut[] = [
  { id: 'go-dashboard', label: 'Dashboard', sub: 'Ana panel', href: '/admin/dashboard', icon: <IconDashboard size={14} /> },
  { id: 'new-article', label: 'Yeni makale', sub: 'Hemen yaz', href: '/admin/articles/new', icon: <IconPlus size={14} /> },
  { id: 'new-artist', label: 'Yeni sanatçı', sub: 'Ekle', href: '/admin/artists/new', icon: <IconPlus size={14} /> },
  { id: 'new-album', label: 'Yeni albüm', sub: 'Ekle', href: '/admin/albums/new', icon: <IconPlus size={14} /> },
  { id: 'go-articles', label: 'Makaleler', sub: 'Listele', href: '/admin/articles', icon: <IconArticle size={14} /> },
  { id: 'go-artists', label: 'Sanatçılar', sub: 'Listele', href: '/admin/artists', icon: <IconArtist size={14} /> },
  { id: 'go-albums', label: 'Albümler', sub: 'Listele', href: '/admin/albums', icon: <IconAlbum size={14} /> },
  { id: 'go-songs', label: 'Şarkılar', sub: 'Listele', href: '/admin/songs', icon: <IconSong size={14} /> },
  { id: 'go-architects', label: 'Mimarlar', sub: 'Listele', href: '/admin/architects', icon: <IconArchitect size={14} /> },
  { id: 'go-genres', label: 'Türler', sub: 'Listele', href: '/admin/genres', icon: <IconGenre size={14} /> },
  { id: 'go-paths', label: 'Dinleme Rotaları', sub: 'Listele', href: '/admin/listening-paths', icon: <IconPath size={14} /> },
  { id: 'go-featured', label: 'Öne Çıkarılanlar', sub: 'Anasayfa düzeni', href: '/admin/featured', icon: <IconDashboard size={14} /> },
  { id: 'go-import', label: 'İçe Aktar', sub: 'CSV', href: '/admin/import', icon: <IconPlus size={14} /> },
  { id: 'go-users', label: 'Kullanıcılar', sub: 'Yönetim', href: '/admin/users', icon: <IconUsers size={14} /> },
  { id: 'go-videos', label: 'Hero Videoları', sub: 'Yönetim', href: '/admin/hero-videos', icon: <IconVideo size={14} /> },
  { id: 'go-settings', label: 'Site Ayarları', sub: 'Yönetim', href: '/admin/settings', icon: <IconSettings size={14} /> },
];

const KIND_META: Record<
  Kind,
  { Icon: (p: { size?: number }) => ReactNode; group: string }
> = {
  article: { Icon: IconArticle, group: 'Makaleler' },
  artist: { Icon: IconArtist, group: 'Sanatçılar' },
  album: { Icon: IconAlbum, group: 'Albümler' },
  song: { Icon: IconSong, group: 'Şarkılar' },
  architect: { Icon: IconArchitect, group: 'Mimarlar' },
  genre: { Icon: IconGenre, group: 'Türler' },
  path: { Icon: IconPath, group: 'Dinleme Rotaları' },
};

export default function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Open/close with ⌘K / Ctrl+K — but only when focus isn't inside a text
  // field, so typing "k" in a content textarea never steals focus.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'k' || !(e.metaKey || e.ctrlKey)) return;
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName;
      const inField = tag === 'INPUT' || tag === 'TEXTAREA' || t?.isContentEditable;
      if (inField && !open) return;
      e.preventDefault();
      setOpen((o) => !o);
    }
    // Allow other components (e.g. the sidebar search button) to open the
    // palette programmatically by dispatching a `btm:open-palette` event.
    function onOpenEvent() {
      setOpen(true);
    }
    window.addEventListener('keydown', onKey);
    window.addEventListener('btm:open-palette', onOpenEvent);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('btm:open-palette', onOpenEvent);
    };
  }, [open]);

  // Autofocus input when opening. We reset state on close so the next open
  // starts fresh.
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 10);
      return () => clearTimeout(t);
    } else {
      setQ('');
      setHits([]);
      setActive(0);
    }
  }, [open]);

  // Debounced server search. We cancel in-flight requests via an ignore flag
  // — simpler than AbortController for this scale.
  useEffect(() => {
    if (!open) return;
    const query = q.trim();
    if (query.length < 2) {
      setHits([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const handle = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/search?q=${encodeURIComponent(query)}`);
        if (!res.ok) throw new Error('search failed');
        const data = await res.json();
        if (!cancelled) {
          setHits(Array.isArray(data.results) ? data.results : []);
          setActive(0);
        }
      } catch {
        if (!cancelled) setHits([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 180);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [q, open]);

  // Compose the list the user navigates with ↑↓. When q is empty we show
  // curated shortcuts; once typing starts it's pure search hits.
  const items = useMemo<
    Array<{ key: string; href: string; node: ReactNode; group: string }>
  >(() => {
    if (!q.trim()) {
      return SHORTCUTS.map((s) => ({
        key: s.id,
        href: s.href,
        group: s.sub,
        node: (
          <>
            <span className="w-7 h-7 rounded-md bg-zinc-800 text-zinc-300 flex items-center justify-center flex-shrink-0">
              {s.icon}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] text-zinc-100 font-medium truncate">{s.label}</p>
              <p className="text-[11px] text-zinc-500 truncate">{s.sub}</p>
            </div>
          </>
        ),
      }));
    }
    return hits.map((h) => {
      const Icon = KIND_META[h.kind]?.Icon ?? IconArticle;
      return {
        key: `${h.kind}:${h.id}`,
        href: h.href,
        group: KIND_META[h.kind]?.group ?? 'Sonuç',
        node: (
          <>
            {h.image ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={h.image}
                alt=""
                loading="lazy"
                decoding="async"
                className="w-7 h-7 rounded-md object-cover flex-shrink-0 ring-1 ring-zinc-800"
              />
            ) : (
              <span className="w-7 h-7 rounded-md bg-zinc-800 text-zinc-400 flex items-center justify-center flex-shrink-0">
                <Icon size={14} />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[13px] text-zinc-100 font-medium truncate">{h.title}</p>
              <p className="text-[11px] text-zinc-500 truncate">{h.sub}</p>
            </div>
          </>
        ),
      };
    });
  }, [q, hits]);

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router],
  );

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, items.length - 1));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === 'Enter') {
      const target = items[active];
      if (target) {
        e.preventDefault();
        go(target.href);
      }
    }
  }

  // Keep the highlighted row scrolled into view as the user arrows through.
  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(`[data-idx="${active}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Komut paleti"
    >
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-zinc-800">
          <span className="text-zinc-500" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
          </span>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ne aramak istersin? Sanatçı, albüm, makale…"
            className="flex-1 bg-transparent outline-none text-sm text-zinc-100 placeholder:text-zinc-500"
          />
          <kbd className="hidden sm:inline-block text-[10px] font-mono text-zinc-500 border border-zinc-700 bg-zinc-800/60 rounded px-1.5 py-0.5">
            ESC
          </kbd>
        </div>
        <div ref={listRef} className="max-h-[60vh] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
          {loading && q.trim().length >= 2 && (
            <div className="px-3 py-6 text-center text-[12px] text-zinc-500">
              Aranıyor…
            </div>
          )}
          {!loading && q.trim().length >= 2 && items.length === 0 && (
            <div className="px-3 py-10 text-center">
              <p className="text-[13px] text-zinc-300">Sonuç bulunamadı</p>
              <p className="text-[11px] text-zinc-500 mt-1">
                Farklı bir kelimeyle dene
              </p>
            </div>
          )}
          <PaletteGroups items={items} active={active} onHover={setActive} onGo={go} />
        </div>
        <div className="flex items-center justify-between px-3 py-2 border-t border-zinc-800 bg-zinc-950/60 text-[10px] text-zinc-500">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="font-mono bg-zinc-800 border border-zinc-700 rounded px-1">↑↓</kbd>{' '}
              gez
            </span>
            <span>
              <kbd className="font-mono bg-zinc-800 border border-zinc-700 rounded px-1">↵</kbd>{' '}
              aç
            </span>
          </div>
          <span>
            <kbd className="font-mono bg-zinc-800 border border-zinc-700 rounded px-1">⌘K</kbd>{' '}
            kapat
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Groups items by their `.group` field so the list reads like
 *   Sanatçılar
 *     ▸ Bob Dylan
 *     ▸ …
 * while preserving a single absolute index across groups (so arrow keys
 * traverse the whole list, not per-group).
 */
function PaletteGroups({
  items,
  active,
  onHover,
  onGo,
}: {
  items: Array<{ key: string; href: string; node: ReactNode; group: string }>;
  active: number;
  onHover: (i: number) => void;
  onGo: (href: string) => void;
}) {
  // Build [groupName → [startIndex, endIndex]] preserving original order.
  const grouped: Array<{ label: string; start: number; end: number }> = [];
  for (let i = 0; i < items.length; i++) {
    const g = items[i].group;
    const last = grouped[grouped.length - 1];
    if (last && last.label === g) last.end = i + 1;
    else grouped.push({ label: g, start: i, end: i + 1 });
  }

  return (
    <div className="py-1">
      {grouped.map((g) => (
        <div key={`${g.label}-${g.start}`} className="py-1">
          <div className="px-3 pt-1 pb-1 text-[10px] uppercase tracking-wider text-zinc-600 font-semibold">
            {g.label}
          </div>
          {items.slice(g.start, g.end).map((item, localIdx) => {
            const idx = g.start + localIdx;
            const isActive = idx === active;
            return (
              <button
                key={item.key}
                data-idx={idx}
                type="button"
                onMouseEnter={() => onHover(idx)}
                onClick={() => onGo(item.href)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                  isActive ? 'bg-zinc-800/80 text-white' : 'hover:bg-zinc-800/50'
                }`}
              >
                {item.node}
                <span
                  className={`text-zinc-500 transition-opacity ${
                    isActive ? 'opacity-100' : 'opacity-0'
                  }`}
                  aria-hidden="true"
                >
                  ↵
                </span>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
