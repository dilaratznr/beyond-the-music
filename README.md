# Beyond The Music

> Müziğin ötesindeki kültürü keşfeden bir arşiv, atlas ve kürasyon platformu.
> *A platform exploring the culture beyond music — an archive, an atlas, a curation.*

Next.js 16 üzerine kurulmuş, iki dilli (TR / EN), içerik-yönetimli müzik platformu. Türler, sanatçılar, albümler, dinleme yolculukları, makaleler ve "The Architects / The Theory" editoryal serilerini tek çatı altında sunar.

## Özellikler

- **İki dilli içerik** — Türkçe ve İngilizce tam kapsama (`next-intl`), admin panelinde Gemini destekli otomatik çeviri (opsiyonel).
- **Sinematik anasayfa** — Hero video carousel, pin + translate tabanlı yatay scroll, GSAP scroll-triggered sahneler.
- **Zengin editoryal altyapı** — TipTap tabanlı rich text editor, featured sıralama, CSV toplu içe aktarım, zamanlı yayınlama.
- **Güvenli admin paneli** — NextAuth oturum yönetimi, rol-bazlı yetkiler, rate-limiting, honeypot korumalı iletişim formu.
- **Medya yönetimi** — Cloudflare R2 / S3 uyumlu depolama, Sharp ile otomatik WebP/AVIF dönüşümü.
- **SEO** — Dinamik `sitemap.ts`, `robots.ts`, structured meta, OG card generator.
- **ISR** — Anasayfa 30 saniyede bir arka planda yeniden üretilir (CDN hızı + DB tasarrufu).

## Stack

- **Framework:** Next.js 16 (App Router) · React 19 · TypeScript
- **DB & ORM:** PostgreSQL · Prisma 6
- **Auth:** NextAuth 4
- **Styling:** Tailwind CSS 4
- **Animation:** GSAP · Lenis · özel `HorizontalScroll` pin bileşeni
- **Editor:** TipTap 3
- **Mail:** SMTP / Resend (opsiyonel)
- **Storage:** Cloudflare R2 / S3 uyumlu (opsiyonel)
- **AI:** Google Gemini — TR ↔ EN çeviri (opsiyonel)

## Hızlı Başlangıç

Gereksinimler: Node 20+, Docker (lokal Postgres için) veya uzak bir Postgres bağlantısı.

```bash
# 1. Bağımlılıklar
npm install

# 2. Lokal DB (Docker)
docker-compose up -d

# 3. Env dosyasını kopyala ve düzenle
cp .env.example .env

# 4. Şemayı push'la + seed
npm run db:setup

# 5. Dev sunucu
npm run dev
```

Tarayıcıda `http://localhost:3000` → otomatik olarak `/tr`'ye yönlenir.

## Komutlar

| Komut | Açıklama |
|---|---|
| `npm run dev` | Next dev sunucu |
| `npm run build` | Prisma generate + Next build |
| `npm run start` | Production sunucu |
| `npm run lint` | ESLint |
| `npm run db:push` | Prisma şemasını DB'ye push'la |
| `npm run db:seed` | Seed data yükle |
| `npm run db:studio` | Prisma Studio GUI |
| `npm run db:setup` | Push + seed (sıfırdan) |
| `npm run analyze` | Bundle analyzer ile build |

## Yayına Alma

Ayrıntılı, adım-adım Vercel + Neon + Cloudflare R2 + Resend rehberi için bkz. [`DEPLOYMENT.md`](./DEPLOYMENT.md).

Türkçe başlangıç rehberi: [`BURADAN_BASLA.md`](./BURADAN_BASLA.md).

## Proje Yapısı

```
src/
├── app/
│   ├── [locale]/        # TR / EN public sayfalar
│   ├── admin/           # Editör paneli
│   ├── api/             # API route'ları (auth, contact, media, …)
│   ├── robots.ts
│   └── sitemap.ts
├── components/
│   ├── public/          # Site görünür bileşenleri
│   └── admin/           # Panel bileşenleri
├── lib/                 # prisma, auth, seo, image-storage, site-config, …
└── i18n.ts              # next-intl ayarları

prisma/
├── schema.prisma
├── migrations/
└── seed.ts
```

## Katkı

Akademisyenler, müzik yazarları, araştırmacılar ve müzisyenler platforma katkıda bulunabilir. İletişim formundan "Yazar Başvurusu" konusuyla ulaşabilirsiniz.

## Lisans

[MIT](./LICENSE)
