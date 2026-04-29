@AGENTS.md

# Beyond The Music — Hızlı referans

## Stack
- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Prisma 6** + **PostgreSQL**
- **NextAuth 4** (admin oturumu)
- **Tailwind 4** + **GSAP** + **Lenis** (smooth scroll)
- **TipTap 3** (rich text editor)
- **next-intl** (TR/EN i18n)

## Önemli path'ler
- `src/app/[locale]/` — public sayfalar (TR / EN)
- `src/app/admin/` — editör paneli
- `src/app/api/` — API route'ları
- `src/components/public/` — anasayfa ve public bileşenleri
- `src/components/admin/` — admin paneli bileşenleri
- `src/lib/` — prisma, auth, seo, image-storage, **site-contact** (iletişim + sosyal linkler), site-sections, …
- `src/i18n.ts` — dictionary loader
- `prisma/schema.prisma` — DB şeması
- `prisma/seed.ts` — seed data

## Komutlar
- `npm run dev` / `npm run build` / `npm run start`
- `npm run lint`
- `npm run db:push` · `npm run db:seed` · `npm run db:studio` · `npm run db:setup`

## Dikkat edilecek konvensiyonlar
- **Her iki dil zorunlu** — bir içerik alanı varsa `nameTr` + `nameEn`, `titleTr` + `titleEn` şeklinde çiftli olur.
- **ISR:** anasayfa `revalidate = 30` — `force-dynamic` bilinçli olarak kullanılmıyor (perf baseline için `PERF-BASELINE.md`).
- **Yatay scroll sahneleri** `src/components/public/HorizontalScroll.tsx` ile yapılır (pin + translate, kart yüksekliğine göre ölçülmüş sticky).
- **Site ayarları** admin tarafında `SiteSetting` modeliyle DB'den okunur; section enable/disable için `src/lib/site-sections.ts` merkezi liste.
- **İletişim ve sosyal linkler** Super Admin tarafından `/admin/settings`'ten yönetilir; runtime okuma `src/lib/site-contact.ts` (`getSiteContact`) üzerinden `SiteSetting` tablosuna gider. Boş bırakılan alan public sitede hiç render edilmez (telefon dahil).
- **Medya:** upload'lar R2/S3'e gider; yoksa `/public/uploads`'a düşer (serverless'te kalıcı değil — bkz. `DEPLOYMENT.md`).

## İlgili dokümanlar
- `README.md` — genel tanıtım + hızlı başlangıç
- `DEPLOYMENT.md` — adım-adım production deploy rehberi
- `BURADAN_BASLA.md` — Türkçe başlangıç
- `PERF-BASELINE.md` — performans ölçümleri
- `AGENTS.md` — Next.js 16 ile çalışırken agent'lar için uyarı notu
