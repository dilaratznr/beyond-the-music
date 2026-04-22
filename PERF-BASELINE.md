# Performance & SEO Baseline

> Branch: `perf/cache-images-seo`
> Captured: 2026-04-22
> Stack: Next.js 16.2.1 (Turbopack) · React 19.2.4 · Prisma 6.19.2

This file is the "before" snapshot we measure improvements against. Do not
delete after the work lands — we compare the final numbers to this baseline in
the PR description.

---

## Bundle (Turbopack analyze, `next experimental-analyze --output`)

Written to `.next/diagnostics/analyze/` (gitignored).

### Top client chunks (root `/` route)

| File                        | Size      |
| --------------------------- | --------- |
| `64e504f815854219.js`       | 603 KB    |
| `29df097d1082f81a.js`       | 401 KB    |
| `0dcb8fbb7c502475.js`       | 140 KB    |
| `a6dad97d9634a72d.js`       | 110 KB    |
| `b607dc4daafe934d.js`       | 46 KB     |
| `adecd0ef71a11c8f.css`      | 43 KB     |
| `14ceeeaa07f3cde1.js`       | 26 KB     |
| `turbopack-*.js` (runtime)  | 18 KB     |
| **Total static/chunks**     | **~1.4 MB** |

> Suspect heavy hitters: TipTap editor (admin) leaking into public bundles,
> GSAP, `@studio-freight/lenis` (renamed to `lenis`), next-auth client.
> To confirm, run `npm run analyze` and inspect the tree view.

### Commands

```bash
npm run analyze           # Turbopack-native analyzer (Next 16)
npm run analyze:webpack   # Legacy webpack-based (fallback, opens .html)
```

---

## Images

| Metric                                     | Value       |
| ------------------------------------------ | ----------- |
| Raster files in `public/`                  | **0** (only 5 SVGs) |
| `public/uploads/`                          | runtime-created, not in repo |
| `sharp` installed                          | ❌ no        |
| Upload pipeline resize / convert           | ❌ none      |
| `<img>` tags in `src/`                     | **35** across 24 files |
| `next/image` usage in `src/`               | **0** (one false positive in `proxy.ts`) |
| `next.config.ts` formats priority          | `avif`, `webp` ✅ |
| `minimumCacheTTL`                          | 86400s (1 day) |

**Biggest `<img>` hotspots:**

- `src/app/[locale]/page.tsx` — 8 occurrences (home page hero / featured grids)
- `src/app/admin/genres/page.tsx` — 2
- `src/app/admin/featured/page.tsx` — 2
- `src/app/[locale]/listening-paths/[slug]/page.tsx` — 2
- `src/app/[locale]/artist/[slug]/page.tsx` — 2
- 19 other files with 1 each

---

## Caching

| Layer                         | Current state                          |
| ----------------------------- | -------------------------------------- |
| ISR `revalidate`              | `30s` on every public page             |
| `unstable_cache` usage        | **0**                                  |
| `revalidateTag` usage         | **0**                                  |
| React `cache()` dedup         | **0**                                  |
| Redis / external cache        | none                                   |
| Public API route cache        | no `revalidate` export, no headers     |
| HTTP `Cache-Control` headers  | only security headers set; no asset cache headers |

---

## SEO

| Signal                           | State                                 |
| -------------------------------- | ------------------------------------- |
| `generateMetadata` coverage      | **7 / 13** public routes              |
| Missing metadata                 | listing pages: `artist`, `album`, `genre`, `architects`, `theory`, `ai-music`, `listening-paths`, `search`, `contact` |
| `robots.ts` / `robots.txt`       | ❌ missing                             |
| `sitemap.ts`                     | ✅ exists, `lastModified: new Date()` (stale signal) |
| `manifest.ts`                    | ❌ missing                             |
| `opengraph-image.tsx`            | ❌ missing (favicon only)              |
| JSON-LD                          | ✅ 5 detail routes (MusicGroup / Person / MediaObject / BlogPosting) |
| JSON-LD gaps                     | no `WebSite`+`SearchAction`, no `BreadcrumbList`, no listing `CollectionPage` |
| hreflang (root layout)           | ✅ `tr`, `en`                           |
| hreflang (per page)              | ✅ via `buildPageMetadata()`            |
| `x-default` fallback             | ❌ missing                              |
| Sitemap `alternates.languages`   | ❌ missing                              |
| Sitemap image extensions         | ❌ missing                              |

---

## Lighthouse targets (post-work goals)

We did not capture Lighthouse scores at baseline because the dev server and
seed data do not represent production traffic. Targets to beat on a cold
production build after Phase 6:

| Category        | Target  |
| --------------- | ------- |
| Performance     | ≥ 90    |
| Accessibility   | ≥ 95    |
| Best Practices  | ≥ 95    |
| SEO             | **100** |

Key CWV budgets:

- **LCP** < 2.5s (hero image / title)
- **CLS** < 0.1
- **INP**  < 200ms

---

## Phase checklist

- [x] **Phase 0** — branch + analyzer wired + this file
- [ ] Phase 1 — sharp + upload pipeline + migration script
- [ ] Phase 2 — `SmartImage` + 35 `<img>` → `<Image>`
- [ ] Phase 3 — `db-cache` + `revalidateTag` on admin mutations
- [ ] Phase 4 — metadata for listing pages + `robots.ts` + `x-default` + sitemap `lastModified`
- [ ] Phase 5 — dynamic OG image + JSON-LD expansion
- [ ] Phase 6 — `manifest.ts` + asset `Cache-Control` + font self-host
