# Beyond The Music — Proje Denetim Raporu

**Tarih:** 2026-05-13
**Kapsam:** Tüm repo — mimari, güvenlik, performans, SEO, erişilebilirlik, test, CI, dokümantasyon
**Yöntem:** Kod okuması (statik analiz; runtime ölçüm yapılmadı)
**Hedef:** Production'a daha hazır, daha dayanıklı bir kod tabanı

## Yönetici özeti

Proje, kişisel/küçük ekip projelerinin çoğundan **belirgin biçimde daha olgun** durumda. Tasarım kararları sadece çalışmış değil, gerekçesiyle birlikte yorum satırlarına işlenmiş; tehdit modeli (timing attack, CSRF, SSRF, header injection, pixel-flood, stale JWT, 2FA bypass) bilinçli işlenmiş; ISR/cache stratejisi düşünülmüş; rate limit hem Upstash hem in-memory fallback'le yazılmış. Bu mimari kalite seviyesinde "tamamen eksik bir parça" değil, **küçük ama önemli boşluklar** kalıyor.

Aşağıdaki bulgular **önem sırasına göre** sıralandı. Her madde için: konum, neden önemli, somut öneri.

**Önem tanımı**

- **Kritik** — sömürülebilir güvenlik açığı veya production'da veri kaybı riski.
- **Yüksek** — production hazırlığı için yapılması gereken, kullanıcı veya SEO etkisi olan eksik.
- **Orta** — kod kalitesi / sürdürülebilirlik / DX iyileştirmeleri.
- **Düşük** — temizlik, kozmetik veya "nice to have".

---

## Kritik (3)

### K1. `GET /api/settings` kimlik doğrulaması olmadan tüm site ayarlarını dökiyor

**Konum:** `src/app/api/settings/route.ts:7-12`

```ts
export async function GET() {
  const settings = await prisma.siteSetting.findMany();
  const map: Record<string, string> = {};
  for (const s of settings) map[s.key] = s.value;
  return NextResponse.json(map);
}
```

PUT `requireAuth('SUPER_ADMIN')` ile korunmuş ama GET tamamen açık. `SiteSetting` tablosu bugün public alanları (iletişim e-posta, telefon, adres, sosyal linkler, font seçimi, custom nav) tutuyor — yani teorik olarak "zaten public". Ama:

- Bu endpoint tüm anahtarları toplu olarak dökiyor; ileride bir Super Admin tarafından girilebilecek "internal-only" bir ayar (örn. davet linki domain'i, dahili Slack webhook, draft hero video URL, henüz aktif olmayan kampanya başlığı) eklenirse otomatik sızar.
- Sayfanın UI'da hiç render etmediği alanlar bile machine-readable şekilde dış dünyaya çıkar — telefon ve adres scraper'lar için tek nokta.
- Rate limit de yok.

**Öneri:** GET'i de `requireAuth('SUPER_ADMIN')` arkasına al. Public site'ın ihtiyaç duyduğu alanlar (iletişim, branding, sosyal linkler) zaten `getSiteContact()`, `getSiteBranding()`, vs. server-side helper'larıyla doğrudan Prisma'dan okunuyor — frontend'in bu endpoint'e ihtiyacı yok. Eğer client-side okumak gerekiyorsa açıkça **whitelist'lenmiş** bir alt küme döndüren ayrı bir endpoint yap.

### K2. `prisma db push --accept-data-loss` production build pipeline'ında çalışıyor

**Konum:** `package.json:7` (`build` script), `prisma/` (migrations klasörü yok)

```
"build": "prisma generate && npx tsx scripts/migrate-add-username.ts && prisma db push --accept-data-loss --skip-generate && next build"
```

- `prisma db push` schema'yı declarative olarak DB'ye yansıtır; **migration history tutmaz** ve schema'dan silinen kolonu **sessizce drop eder**. `--accept-data-loss` ile birlikte sözleşme şu olur: "schema'da kalmayan kolonları sor sormaa düşür".
- Schema'da hata yapan (örn. bir kolonu yanlışlıkla silen) bir geliştirici PR merge ettiğinde, sonraki Vercel deploy'u DB'den o kolonu — ve içindeki tüm veriyi — silebilir. Geri dönüş yok.
- Migration olmayınca staging/prod arası schema farkını izlemek de mümkün değil.

**Öneri:** `prisma migrate deploy`'a geç. Tek seferlik geçiş:

1. Mevcut DB'den `prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma` ile baseline migration üret.
2. `prisma/migrations/0000_init/migration.sql` olarak commit'le.
3. Build script'i `prisma migrate deploy && next build` yap.
4. `scripts/migrate-add-username.ts` gibi one-off scriptleri proper migration olarak yeniden yaz veya seed sonrası tek seferlik çalıştırılacak şekilde build'den çıkar.

Aciliyet: bir sonraki schema değişikliği canlı veri silmeden önce.

### K3. Sırlar dahil `.env*.local` dosyaları çalışma dizininde duruyor

**Konum:** repo kökü

```
.env                       (728 B)
.env.local                 (1.3 KB — VERCEL_OIDC_TOKEN içeriyor)
.env.production.local      (2.1 KB)
```

`.gitignore` doğru biçimde `.env*.local` ve `.env`'i kapsadığı için **git'e commit edilmemişler**. Ama:

- Yerel disk şifrelenmemişse (FileVault kapalıysa) bir hırsız ele geçirebilir.
- `.env.local` içindeki **VERCEL_OIDC_TOKEN** Vercel'e federated deploy yetkisi veriyor; süresi dolduktan sonra yenisi otomatik yazılıyor ama aktif tokeni alan biri proje deploy edebilir.
- Aynı içerik herhangi bir backup/cloud sync ile (Dropbox, iCloud Desktop, Time Machine ağ paylaşımı) dışarı sızabilir.

**Öneri:**

- `.env.production.local` dosyasını yerelden **sil** — production env'leri Vercel UI'da yaşıyor, yerelde tutmaya gerek yok.
- `.env.local` Vercel CLI tarafından otomatik üretiliyor; gerekmediği sürece silebilirsin (`vercel env pull` ihtiyaç hâlinde yeniden çeker).
- Kritik sırların listesini gözden geçir: NEXTAUTH_SECRET, CRON_SECRET, AWS keys, GEMINI_API_KEY — bunlardan herhangi biri commit edildiyse rotate et (history'de aramak için: `git log --all --full-history -p -- .env*`).

---

## Yüksek (8)

### Y1. SiteSetting verilerine herhangi bir validation yok (XSS / SSRF vektörü)

**Konum:** `src/app/api/settings/route.ts:14-30`

```ts
for (const [key, value] of Object.entries(body)) {
  if (typeof value !== 'string') continue;
  await prisma.siteSetting.upsert({ where: { key }, update: { value }, create: { key, value } });
}
```

- Hiçbir key allowlist'i yok — Super Admin yanlışlıkla (ya da kompromize hesap) keyfi key yazabilir. Daha kötüsü, sonraki sürümde SiteSetting'i `JSON.parse(value)` ile okuyan kod gelirse genişlemiş saldırı yüzeyi.
- `social_instagram` gibi URL alanları `url-validation.ts` kullanılmadan ham olarak yazılıyor. Bir Super Admin sosyal link alanına `javascript:alert(1)` yazarsa Footer'da `<a href={url}>` olarak render edilir → stored XSS. (CSP `script-src` darldığı için ciddi etkisi yumuşar ama `<a href="javascript:...">` yine de tıklayan kullanıcıyı yakalar.)
- `contact_email` gibi alanlarda format kontrolü yok.

**Öneri:** PUT içinde key'ler için allowlist (örn. `SITE_CONTACT_KEYS` + `BRANDING_KEYS` + ... bütünleşik liste), value tarafında `validateImageUrl` benzeri sınırlı bir URL guard'ı (`https://` zorunlu, `javascript:`/`data:` reddet) ve string uzunluk limiti (örn. 500).

### Y2. `prefers-reduced-motion` desteği yok

**Konum:** `src/components/public/SmoothScroll.tsx`, `HorizontalScroll.tsx`, `MagneticButton.tsx`, `TextRevealOnScroll.tsx` ve Lenis kullanımı

GSAP + Lenis tüm sayfada agresif animasyon çalıştırıyor (fade/slide/zoom/scrub). Vestibüler bozukluğu olan veya hareketten rahatsız olan kullanıcılar için bu erişilebilirlik bariyeri. WCAG 2.3.3 (Animation from Interactions) ve özellikle iOS/macOS sistem ayarı "Reduce Motion" otomatik dikkate alınmıyor.

**Öneri:** SmoothScroll içinde:

```ts
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (prefersReducedMotion) {
  // Tüm öğeleri opacity:1 + transform:none ile bırak, Lenis'i hiç başlatma
  document.querySelectorAll('.gsap-fade-up, .gsap-slide-left, ...').forEach(el => {
    el.style.opacity = '1';
    el.style.transform = 'none';
  });
  return;
}
```

Bonus: `HorizontalScroll`'un pin davranışı da reduced-motion'da düz dikey scroll'a düşmeli.

### Y3. PWA manifest eksik ikon ölçüleri

**Konum:** `src/app/manifest.ts:22-26`

```ts
icons: [
  { src: '/favicon.ico', sizes: 'any', type: 'image/x-icon' },
],
```

- Android için 192x192 ve 512x512 zorunlu (Lighthouse PWA testinde fail).
- Maskable ikon yok (Android adaptive icon kırpılır).
- `apple-icon.tsx` ayrıca tanımlı ama manifest'e dahil değil.

**Öneri:** `src/app/icon.png` (512x512, maskable padding ile) ve `src/app/icon-192.png` ekle (Next.js dosyaya bakıp manifest'i otomatik dolduruyor) veya manifest'e şu üç ikonu ekle: 192x192 standart, 512x512 standart, 512x512 `purpose: 'maskable'`.

### Y4. Twitter/X Card metadata'da `site` ve `creator` yok

**Konum:** `src/lib/seo.ts:73-83`

```ts
twitter: {
  card: image ? 'summary_large_image' : 'summary',
  title, description, images: image ? [image] : undefined,
},
```

- `twitter.site` (örn. `@beyondthemusic`) ve `twitter.creator` set edilmezse X tarafında "Card by [unknown]" görünüyor; analytics impressions düşük çıkar.
- Aynı yerde `openGraph.images` da `width`/`height` taşımıyor (Facebook'un Sharing Debugger bunu uyarı olarak işaretler).

**Öneri:** SEO_SITE_TWITTER env'i veya sabit ekle, `twitter.site` ve `twitter.creator` set et. `images` array'inde `{ url, width: 1200, height: 630, alt: title }` ver.

### Y5. Görsel `alt` boş bırakılmış 25 nokta — bir kısmı içerik

**Konum:** `src/components/public/PageHero.tsx:33`, `ArticleCard.tsx:59,97`, `SearchBar.tsx:204`, `HeroVideoCarousel.tsx:46`

`alt=""` dekoratif görseller için doğru pattern, ama:

- `ArticleCard`'daki kart görseli artikül başlığını taşıyor — dekoratif değil. Ekran okuyucusu kullanıcısı için makale bağlantısı sadece başlık metniyle anlamlı oluyor (resim kayboluyor).
- `PageHero` arka plan görseli için OK ama context'e göre `alt={pageTitle}` daha doğru olabilir.

**Öneri:**

- Dekoratif olduğundan emin olduğun her `alt=""` için `aria-hidden="true"` da ekle (semantik netlik).
- `ArticleCard` gibi içerikle ilişkili görsellerde `alt={titleTr || titleEn}` kullan. (Eğer yanında başlık metni varsa, ekran okuyucusunun iki kez okumaması için `alt=""` doğru tercih olabilir — bu durumda yorum yaz.)

### Y6. Yerelde duran `.removed` / `.bak` dosyaları repo dizininde

**Konum:** `DEPLOYMENT.md.bak.removed`, `home-fallback-fix.patch.removed`, `scripts/deploy-db.sh.removed`, `scripts/schema.sql.removed`, `test-matcher.js` (boş)

- `.gitignore` `*.bak`, `*.patch`, `*.removed` kapsadığı için commit'lenmemişler.
- Ama dizinde durmaları kafa karıştırıyor, yeni bir geliştirici "bunu silebilir miyim?" diye soruyor.
- `test-matcher.js` (0 byte) script veya tool izi olabilir; kontrol edilip silinmeli.

**Öneri:** Hepsini sil. Vercel deploy'unda hiçbir etkileri yok zaten — ama temiz dizin = daha az "is this still needed?" mental yükü.

### Y7. CI'da Playwright e2e koşulmuyor

**Konum:** `.github/workflows/ci.yml`

CI 4 job çalıştırıyor: `lint`, `test` (vitest unit), `typecheck`, `build`. Playwright `smoke.spec.ts` (login redirect, robots, sitemap, cron auth, rate limit) yazılmış ama CI'da koşulmuyor. PR review'inde "build çalıştı" bilgisi var ama "robots/sitemap/login akışı çalışıyor mu" bilgisi yok — manuel test gerekiyor.

**Öneri:** `ci.yml`'a yeni job ekle:

```yaml
e2e:
  runs-on: ubuntu-latest
  services:
    postgres:
      image: postgres:16-alpine
      env: { POSTGRES_PASSWORD: ci }
      ports: ['5432:5432']
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with: { node-version: '20', cache: 'npm' }
    - run: npm ci
    - run: npx prisma db push
      env: { DATABASE_URL: postgresql://postgres:ci@localhost:5432/postgres }
    - run: npx playwright install --with-deps chromium
    - run: npm run test:e2e
      env:
        DATABASE_URL: postgresql://postgres:ci@localhost:5432/postgres
        NEXTAUTH_SECRET: ci-only
        NEXTAUTH_URL: http://localhost:3000
        NEXT_PUBLIC_APP_URL: http://localhost:3000
```

### Y8. Bağımlılık güncellemeleri için Dependabot/Renovate yok

**Konum:** `.github/`

`.github/dependabot.yml` yok. Next 16, Prisma 6, NextAuth 4 → güvenlik patch'leri (özellikle NextAuth 4'ün 5'e gitmesi konuşulan) elle takip ediliyor. Bu hızda bir proje için aylar geçtikten sonra "ne kadar geride kaldık?" sorusu cevapsız kalır.

**Öneri:** `.github/dependabot.yml`:

```yaml
version: 2
updates:
  - package-ecosystem: npm
    directory: /
    schedule: { interval: weekly }
    groups:
      minor-and-patch:
        update-types: [minor, patch]
    open-pull-requests-limit: 5
  - package-ecosystem: github-actions
    directory: /
    schedule: { interval: monthly }
```

Alternatif: Renovate (daha akıllı grouping).

---

## Orta (12)

### O1. Hata izleme (Sentry/posthog/error-tracking) yok

`global-error.tsx` ve `[locale]/error.tsx` `console.error(error)` çağırıyor — Vercel log'larına düşüyor ama tek tek hatayı görmek için manuel grep gerekiyor. Production'da gerçek bir kullanıcının başına gelen ilk 500 fark edilmiyor.

**Öneri:** Sentry (free tier 5K events/ay yeter), basit setup: `@sentry/nextjs` + `sentry.client.config.ts` + `sentry.server.config.ts`. `error.digest` zaten kullanıcıya gösteriliyor; Sentry tarafıyla eşleşmesi için `Sentry.captureException(error, { tags: { digest: error.digest } })` ekle.

### O2. Logger soyutlaması yok — `console.warn`/`error` her yerde

26 yerden `console.error`/`console.warn` çağrılıyor. Production'da yapısal log (JSON, level, request id) Vercel'in Drain'lerini ya da Sentry'i daha verimli kullanır.

**Öneri:** `src/lib/logger.ts` minimal wrapper: `logger.error(message, { error, ...context })` → Sentry'e gönder + console'a düş. Tedrici bir geçiş.

### O3. `next/image` neredeyse hiç kullanılmıyor

ESLint'te `@next/next/no-img-element` kapatılmış, gerekçe `eslint.config.mjs`'te yazılı (Vercel image optimization R2 ile double-encode etmesin diye). Bu mantıklı **decoratif görseller** için. Ama:

- LCP elementi olan hero ve kart görseli `<img>` ile → preload, priority, srcset, lazy/loading hint yok.
- Mobil'de büyük resimler 1:1 boyutta indiriliyor; gerçek bir LCP iyileştirme fırsatı kaçırılıyor.

**Öneri:** `next/image` kullanımını **LCP elementlerine sınırla** (hero kart, üst kart). R2'den gelen WebP zaten optimize, ama `<Image>` ile `priority`, `sizes`, `quality={85}` + browser-native `loading="lazy"` kazanımları büyük. ESLint kuralını kapatmak yerine "warn" yap ve istisnaları yorumla işaretle.

### O4. Build script'inde inline `migrate-add-username.ts` çalışıyor — eski göç koduyla deploy yavaşlıyor

`package.json:7` her production build'de bu script'i çalıştırıyor. Geçiş çoktan tamamlandıysa (canlı DB'de tüm user'lar username'li ise) script idempotent olarak hızla return ediyor ama yine de DB turu + tsx start cost'u var.

**Öneri:** Geçiş tamamlandığını teyit et (`SELECT count(*) FROM "User" WHERE username IS NULL` = 0), sonra script'i build'den çıkar. Proper bir migration file olarak (Prisma migrate adımı sırasında) tarihe geç.

### O5. Audit log retention manuel — büyüme sınırı yok

`AuditLog` modelinde "90 gün sonra sil" diye yorum var ama implemente edilmemiş. Yıllar sonra tablo büyüyüp index efficiency'sini düşürür; kullanıcı pasifleştirildiğinde `actorId null'a düşüyor` ama log kalıyor → eski log'lar `targetType+targetId` ile aranan satırlar dolu.

**Öneri:** `src/app/api/cron/cleanup-tokens/route.ts` zaten günde bir çalışıyor. Aynı endpoint'e bir DELETE ekle: `prisma.auditLog.deleteMany({ where: { createdAt: { lt: ninetyDaysAgo } } })`. Şu an `LOGIN_FAILURE` gibi yüksek hacimli event'ler için belki daha kısa retention (30 gün) ayrı tutulabilir.

### O6. `as any` kullanımları + dış üç dosyada `prisma as any`

**Konum:** `src/app/api/admin/audit/route.ts:32`, `src/app/api/cron/cleanup-tokens/route.ts:93`, `src/lib/audit-log.ts:27`

```ts
const db = prisma as any;
```

Yorum okumadan tahmin: muhtemelen `auditLog` modeli yeni eklendiği için Prisma client tip'i refresh edilmemiş. `npm run db:generate` sonrası çoğu kalkar.

**Öneri:** `prisma generate` çalıştırıp tipleri yenile, sonra `as any`'leri kaldır. Geri gelirse gerçek root cause'u yorum olarak işaretle.

### O7. Husky / lint-staged yok — pre-commit kontrolü yok

Şu an commit yapan biri lint hata yapan kodu push edebilir, CI'da yakalanıyor ama feedback gecikmesi 2-5dk. Tek geliştiriciyle önemsiz ama ileride ekip büyüyünce can sıkıcı.

**Öneri:** `husky` + `lint-staged`:

```json
"lint-staged": {
  "*.{ts,tsx}": ["eslint --fix", "git add"]
}
```

### O8. Public `<img>` kullanımları `loading="lazy"` taşımıyor

Anasayfa kart listeleri (Genres, Albums, Articles) viewport altı görselleri eagerly yüklüyor. İlk paint'te 6-8 kart × ~50KB WebP = 300-400KB gereksiz.

**Öneri:** Decorative olmayan `<img>` tag'lerine `loading="lazy"` ve `decoding="async"` ekle. Hero / ilk kart `loading="eager"`.

### O9. `403 / 429 / 503` yanıtlarının `Cache-Control` header'ı yok

Public API'lerde rate-limit yanıtı dönerken `Cache-Control: no-store` set edilmiyor. CDN bir 429'u cache'leyebilir → meşru kullanıcı saat sonra hâlâ 429 alır.

**Öneri:** `rate-limit.ts` içindeki `rateLimitResponse` helper'ı (varsa) hata response'una `Cache-Control: no-store` ekle. Tek satırlık kazanım.

### O10. CSP `script-src 'unsafe-inline'` (public CSP)

`next.config.ts:23` public CSP'de `script-src 'self' 'unsafe-inline'` var. Comment doğru: Next 16'da hydration script'lerini nonce'la imzalamak ISR'i bozuyor. Ama:

- `'unsafe-inline'` aktifken bir XSS payload'ı inline script çalıştırabilir.
- Modern alternatif: `'strict-dynamic'` + nonce + `'unsafe-inline'` (eski tarayıcı fallback) → modern tarayıcılar `'unsafe-inline'`'i görmezden gelir.
- VEYA: Next 16'nın deneysel "View Transitions/PPR + nonce" pattern'ini araştır.

**Öneri:** Kısa vadede CSP-Report-Only header ile gerçek script kaynaklarını topla, sonra `script-src 'self' 'strict-dynamic' nonce-XXX 'unsafe-inline'` hibrid yaklaşımına geç. Bu işin acelesi yok ama uzun vadeli güvenlik investment'i.

### O11. `X-XSS-Protection: 1; mode=block` deprecated

**Konum:** `next.config.ts:80`

Chrome 78+, Edge, Firefox bu header'ı yıllar önce kaldırdı. Eski IE/Safari için kalıyor ama bazı browser sürümlerinde yanlış XSS detection'la **yeni vektörler açtığı** bilinen bir header. Modern öneri: kaldır veya `0` ver.

**Öneri:** Header'ı sil (CSP zaten çok daha güçlü koruma sağlıyor).

### O12. Public docker-compose default şifresi `btm_secret_2024`

**Konum:** `docker-compose.yml`

Sadece local dev için ama README'de "production'da değiştir" notu yok ve `.env.example`'da `btm_secret_2024` default'u var. Yeni başlayan biri farkında olmadan production'a deploy edebilir.

**Öneri:** docker-compose.yml ve .env.example'da büyük harfle yorum:

```
# DEV ONLY — production'da MUTLAKA değiştir.
```

---

## Düşük (8)

### D1. `vercel-setup.sh` repo'da; SMTP credentials yazma akışını ortaya koyuyor

İçinde gerçek şifre yok (read prompt'u var) ama `https://beyond-the-music-xi.vercel.app` adresi ve "Resend" tercihi public olarak belli. Ufak bilgi sızıntısı, önemsiz ama temizlik kalemi.

**Öneri:** Script'i `scripts/`'e taşı + `.gitignore`'da `/scripts/deploy-*` zaten kapsıyor; isim değiştir veya gitignore pattern'ını genişlet.

### D2. `next-env.d.ts` gitignore'da ama gerekli

Next.js'in canonical kurulumunda `next-env.d.ts` commit edilir (TS path mapping için Next pluginini bildiriyor). `.gitignore`'da var → her clone'da boş ve `npm run dev` regenerate ediyor, ama CI'da typecheck race condition'a girebilir.

**Öneri:** `.gitignore`'dan kaldır, commit'le. Next docs official tavsiyesi bu.

### D3. `tsconfig.tsbuildinfo` repo dizininde (1.2 MB)

Local olarak yazılıyor (`incremental: true`). `.gitignore`'da `*.tsbuildinfo` var, OK — ama dizinde duruyor. Yeni klon sonrası ilk `tsc` yavaş olabilir; ama bu zaten kullanıcı seçimi. Daha kritik değil.

### D4. Sitemap entry tipi `string` slug'lar kontrol edilmiyor

`src/app/sitemap.ts` slug'ları doğrudan URL'e koyuyor. Eğer DB'de bir slug yanlışlıkla boşluk veya `/` içerirse sitemap kırılır. Slug'lar admin save'inde `slugify` ile yazılıyor; muhtemelen sorun yok ama ekstra `.filter(row => /^[a-z0-9-]+$/.test(row.slug))` defense-in-depth olur.

### D5. `og-card.tsx` fallback fontu Inter — Türkçe karakterler eksik gözükebilir

Satori, font olmadan render edince Türkçe ı/ş/ç gibi karakterleri bozabilir. `next/og`'un default'u Latin-only. Test edilmesi gereken bir konu.

**Öneri:** `ImageResponse`'a `fonts: [{ name: 'Inter', data: ..., weight: 700 }]` ekle veya Türkçe başlığı olan bir makale için OG image'i bir kez ziyaret et + Twitter Card Validator ile bak.

### D6. `next.config.ts` font-src `data:` izniyle birlikte; minimum izin

Self-hosted next/font kullanılıyor, `font-src 'self' data:` yeterli. Ama `style-src 'self' 'unsafe-inline'` zaten geniş — `font-src` saldırı yüzeyini büyütmüyor ama temizlemek isterseniz `data:` opsiyoneldir.

### D7. README ve BURADAN_BASLA.md varlığı good, ama CONTRIBUTING.md yok

İleride başka biri katkı verirse "branch convention, PR template, commit message style" sorularına cevap yok. Tek geliştiriciyle önemsiz.

### D8. `prisma/seed.ts` 258 satır — modülerleştirilebilir

Tek dosyada artist + album + genre + article seed'i hep beraber. İleride seed eklerken merge conflict olası. Şu an çalışıyor, dokunma listesinde değil.

---

## Eklenmesi düşünülebilecek özellikler (yapılmamış ama proje "profesyonel" olmak için faydalı)

Bu liste eksik değil ama sektör standardı:

- **Sentry / posthog (O1)** — error & frontend observability.
- **Plausible / Umami / Vercel Analytics** — privacy-first ziyaretçi metrikleri. GDPR uyumlu, cookie banner gerektirmiyor.
- **Algolia / Meilisearch** — public search şu an 6 `prisma findMany` ile çalışıyor; içerik 500'ü geçince yavaşlar. Meilisearch self-hosted, ücretsiz.
- **Lighthouse CI veya Vercel Web Analytics** — performans regression detection.
- **Bot protection** — Vercel Bot Protection (free) veya Cloudflare Turnstile contact form'da.
- **Backup stratejisi** — Neon/Supabase managed olabilir ama doc'ta "yedek alma adımı" yazılı değil.
- **OpenGraph testleri** — Playwright e2e içinde her entity tipi için `/opengraph-image` 200 dönüyor mu kontrolü.

---

## Hızlı kazanım listesi (1 saatten az iş)

Bu maddeler küçük ama oran olarak en yüksek getiriyi veriyor:

1. **K3** — `.env.local`, `.env.production.local` dosyalarını yerelden sil. Sırları gözden geçir.
2. **K1** — `GET /api/settings`'i SUPER_ADMIN guard'ı arkasına al.
3. **Y6** — `.removed` ve `test-matcher.js` dosyalarını sil.
4. **O11** — `X-XSS-Protection` header'ını kaldır.
5. **Y8** — Dependabot config dosyası ekle.
6. **D7** — CONTRIBUTING.md veya `.github/PULL_REQUEST_TEMPLATE.md` taslağı.

---

---

## Ek bölüm — Admin paneli UX boşlukları (kullanıcı tarafından raporlandı, kod ile teyit edildi)

Bu bölüm günlük kullanım sırasında fark edilen somut engelleri toplar. Hepsi kod tarafında doğrulandı.

### UX1. Admin liste sayfalarının çoğunda **arama (search) yok**

Kod taraması:

| Sayfa | Arama var mı? |
|---|---|
| `/admin/genres` | ✓ var (`"Tür ara…"`) |
| `/admin/topics` | ✓ var (`"Başlık ara…"`) |
| `/admin/users` | ✓ var |
| `/admin/featured` | ✓ var (içerik seçici için) |
| `/admin/albums` | ❌ **yok** |
| `/admin/artists` | ❌ **yok** |
| `/admin/songs` | ❌ **yok** |
| `/admin/articles` | ❌ **yok** |
| `/admin/architects` | ❌ **yok** |
| `/admin/listening-paths` | ❌ **yok** |
| `/admin/hero-videos` | ❌ yok (ama liste küçük) |

İçerik 50+'ya çıkınca paginasyon sayfaları tek tek dolaşmak gerekiyor. `Cmd+F` ise sadece bulunan sayfanın HTML'inde arar — pagination öncesi/sonrası sayfalardaki maddeyi bulamaz.

**Öneri:** Aynı pattern'i tüm liste sayfalarına yay. `/admin/genres/page.tsx` zaten model: client-side `useState`'li search input + client-side `.filter()` (küçük listeler için) veya `?q=...` query param + API tarafında `where: { name: { contains, mode: 'insensitive' } }` (büyük listeler için). `/api/articles`, `/api/albums`, `/api/artists`, `/api/songs` endpoint'leri zaten `page`/`limit`/`category`/`status` query'lerini kabul ediyor — yanlarına `q` eklenmesi yarım gün iş.

### UX2. Uzun `<select>` listeleri — arama imkânı yok (ekran görüntüsündeki sorun)

**Konum:** `src/app/admin/articles/new/page.tsx:258` ("İlgili Sanatçı"), `src/app/admin/articles/[id]/page.tsx` aynısı, `src/app/admin/songs/...` (albüm seçici), `src/app/admin/listening-paths/...` (item seçici)

Native `<select>`'lerde 15 nokta kullanılıyor. Ekran görüntüsündeki "İlgili Sanatçı" dropdown'unda 20+ sanatçı alfabetik dizilmiş — istediğin sanatçıyı bulmak için bütün listeyi gözle taramak gerekiyor. macOS `Bob Dylan`'ı görmen için scroll edip aramak zorunda kaldığında bu görünüyor.

**Öneri:** Combobox / autocomplete component'i ekle. İki yol var:

1. **Hızlı çözüm (kütüphane yok):** `<input type="text">` + alttaki `<ul>` filtreli liste. `headlessui` veya `cmdk` paketi olmadan ~80 satır kod. Filter `name.toLowerCase().includes(query.toLowerCase())` ile.
2. **Daha az iş:** `headlessui` (zaten Next + Tailwind stack'ine uyumlu) `Combobox` component'ini kullan. ~5 satırda hazır.

En kritik 4 select (İlgili Sanatçı, İlgili Tür, Albüm seçici, Topic seçici) öncelik. Geri kalanı (Role, Kategori — sabit 3-10 öğe) `<select>` olarak kalabilir.

### UX3. Önizleme (preview) butonu sadece **Article ve Album**'de var

Kod taraması (`Önizle` literal'ı için):

| Section | Önizleme butonu | Public sayfa var mı? |
|---|---|---|
| Article | ✓ var | ✓ |
| Album | ✓ var | ✓ |
| Artist | ❌ yok | ✓ (`/artist/[slug]`) |
| Genre | ❌ yok | ✓ (`/genre/[slug]`) |
| Architect | ❌ yok | ✓ (`/architects/[slug]`) |
| Listening Path | ❌ yok | ✓ (`/listening-paths/[slug]`) |
| Topic | ❌ yok | ✓ (`/article/topic/[slug]`) |
| Song | n/a | yok (album içinde render) |

Editör/admin bir sanatçı veya türü düzenledikten sonra "public'te nasıl görünüyor?" diye merak ediyor — Article/Album'de tek tıkla bakabiliyor, diğerlerinde URL'i manuel yazmak veya yeni sekme açıp slug'ı eşleştirmek zorunda. `?preview=1` query mekanizması da zaten var — DRAFT/PENDING_REVIEW içerikleri admin oturumuyla göstermek için.

Ek olarak — Article ve Album'de bile **`/new` sayfasında** (henüz kaydedilmemiş içerikte) önizleme yok. Kayıttan SONRA edit sayfasında geliyor. Bu büyük bir eksik sayılmaz ama "kaydet → edit'e git → önizle" akışı taze kullanıcıyı şaşırtır.

**Öneri:** 4 admin edit sayfasında (artists/[id], genres/[id], architects/[id], listening-paths/[id], topics/[id]) aynı pattern'i kopyala. Article'daki örnek:

```tsx
<a
  target="_blank"
  href={status === 'PUBLISHED' ? `/tr/article/${slug}` : `/tr/article/${slug}?preview=1`}
  className="...">
  Önizle
</a>
```

### UX4. "Yeni Kullanıcı" tıklandığında dashboard'a yönlendiriliyor

**Konum:** `src/app/admin/users/new/page.tsx:53-54`

```ts
const isSuperAdmin = session?.user?.role === 'SUPER_ADMIN';
useEffect(() => {
  if (status === 'loading') return;
  if (!isSuperAdmin) router.replace('/admin/dashboard');
}, [status, isSuperAdmin, router]);
```

İki olası nedeni var:

**a)** Aktif oturum SUPER_ADMIN değil (ADMIN veya EDITOR). Bu durumda davranış "doğru" — sadece Super Admin kullanıcı oluşturabiliyor. Ama:

- `/admin/users` listesi de `if (!isSuperAdmin) router.replace('/admin/dashboard')` ile aynı şekilde korunuyor (line 91), yani non-Super-Admin oraya zaten ulaşamamalı.
- "+ Yeni Kullanıcı" butonu `/admin/users` sayfasında **rol kontrolü yapılmadan** render ediliyor (line 197). Yani Super Admin'i listede gördüğü an butonun da görünür olması garanti. Bug değil, bug ihbarı eden senaryoda kullanıcı **gerçekten** Super Admin'dir.

**b)** Oturum Super Admin AMA `session?.user?.role` JWT'den stale geliyor. NextAuth `session.strategy = 'jwt'` ve token 24 saat live; yeni promote edilen bir Super Admin'in JWT'sinde hâlâ ADMIN role yazıyor olabilir.

**Tanı testi:** Browser DevTools → Application → Cookies → `next-auth.session-token` cookie'sini decode et (jwt.io). `role` claim'i `SUPER_ADMIN` mi?

- **Stale ise:** Logout + login → JWT yeniden oluşur, sorun çözülür.
- **`SUPER_ADMIN` ise ve hâlâ redirect oluyorsa:** `useSession()` hook'unun status'ü 'loading' takılıyor olabilir → useEffect erken return ediyor → ama Login akışında flicker bekleniyor. NextAuth `session({ session, token })` callback'inde role doğru aktarılıyor mu kontrol et (`src/lib/auth.ts:79`).

**Öneri (her iki senaryo için de):**

1. **Görünür hata mesajı**: dashboard'a redirect etmeden önce 2sn boyunca "Bu sayfaya yalnızca Super Admin erişebilir" toast'u göster, sonra yönlendir. Şu an sessizce dashboard'a geri atıyor → kullanıcı "ne oldu?" diye soruyor.
2. **Buton koşullu**: `/admin/users/page.tsx:197`'de "+ Yeni Kullanıcı" Link'ini `{isSuperAdmin && <Link>...}` ile sar. Aslında sayfa zaten redirect ediyor ama buton görünüyor → "tıklarım, yeni kullanıcı oluştururum" sözleşmesi kırılıyor.
3. **Session yenileme**: Bir Super Admin başka bir admin'i promote ettiğinde, o admin'in mevcut JWT'si stale kalır. `proxy.ts`'teki stale-JWT defense `role`'ün DB'den farklı olduğunu görüyor ama JWT'yi yeniden basmıyor; sadece role'ün otoritesi DB. UI tarafında `useSession()`'ın gördüğü role hâlâ eski → buton görünmüyor / yeni-kullanıcı sayfası reddediyor. Düzeltme: ya promote sonrası `update()` çağırarak session'ı re-fetch et, ya da `/api/users/me` endpoint'inden gelen `me?.role`'ü tek otorite kabul et (users list zaten bu pattern'i kullanıyor; new page'e de uygulanmalı).

### UX5. Content review kuyruğu — **sadece Article'da gerçekten devrede**

**Konum:** `src/lib/content-review.ts` her şey için tip ve fonksiyon export ediyor (`ReviewSection = 'ARTICLE' | 'ARTIST' | 'ALBUM' | 'GENRE' | 'ARCHITECT' | 'LISTENING_PATH' | ...`), ama:

```
grep submitForReview src/app/api → SADECE articles/route.ts ve articles/[id]/route.ts
```

ARTIST, ALBUM, GENRE, ARCHITECT, LISTENING_PATH için `EntityStatus.PENDING_REVIEW` enum'u Prisma'da, `content-review.ts` helper'larında, `/admin/reviews` UI'daki section labels'inda var — **ama API tarafında çağrılmıyor**. Yani canPublish yetkisi olmayan bir editör bir albüm oluşturduğunda doğrudan PUBLISHED'a (ya da daha kötüsü ne yazılırsa ona) gidiyor; onay kuyruğuna düşmüyor.

Şema yorumunda da bu kabul edilmiş: `// 'ARTICLE' | 'ARTIST' | 'ALBUM' | ... (Faz 2'de genişleyecek)`. Yani bilinçli bir Faz 1 / Faz 2 ayrımı; tam-değil-bug ama **özellik olarak yarım**. Reviews sayfasında ARTIST/ALBUM/GENRE labels'larını görüp tıklayan bir Super Admin "hiç onay bekleyen yok" görüyor — çünkü hiçbir zaman buraya hiçbir şey düşmüyor.

**Öneri (iki seçenek):**

1. **Şimdilik UI'dan gizle**: `/admin/reviews/page.tsx`'te section filtresinden ARTICLE dışındakileri çıkar veya yorum ekle "(Faz 2)".
2. **Tamamla**: `articles/route.ts`'teki `canUserPublish` + `submitForReview` pattern'ini diğer 5 entity API'sine kopyala. ~30 satırlık bir helper'a çıkarılabilir; iş yarım gün.

Tercih (1) daha hızlı — yarım hissi vermez. Tercih (2) gerçek değer üretir ama scope açıyor.

---

## Onaylanan güçlü yönler

Bu rapor eksikleri saymak için yazıldı, ama yansıtmak adına: aşağıdaki şeyler **çoğu projenin yapmadığı** şeyler ve gerçekten iyi yapılmış:

- **Constant-time auth** (`src/lib/auth.ts:9-12`) — username enumeration timing attack'e karşı dummy bcrypt.
- **2FA gating + half-auth session marker** (`auth.ts:64-70`, `auth-guard.ts:53-66`) — JWT'de `tfaPending` flag'i ile API katmanında bypass engellenmiş.
- **Stale-JWT defense** (`proxy.ts:185-225`) — pasifleştirilen admin 60sn içinde fark ediliyor + mutating action'da anında.
- **CSRF defense** (`proxy.ts:88-118`) — same-origin check mutating /api isteklerinde.
- **CSP dual-layer** — public için static (ISR cacheable), admin için per-request nonce. Düşünülmüş trade-off.
- **Audit log + IP hash + retention plan** — forensic hazır.
- **Backup codes hash'lenmiş** — `BackupCode` modelinde raw kod yok.
- **Magic byte image validation** — `validateImageBuffer` upload'ta sharp metadata + pixel-flood koruması.
- **Header injection defense** contact form'da (`route.ts:43-44`) — CRLF stripping.
- **Honeypot field** contact form'da.
- **Rate limit dual-backend** (Upstash + in-memory fallback).
- **ISR-aware cache invalidation** — `unstable_cache` + `revalidateTag` her domain'de.
- **`a11y skip link`** layout'ta var.
- **Yorum kalitesi** — neredeyse her bilinçli karar (`force-dynamic` kullanmama, `n/img-element` rule disable, `db push` kararı) yorum satırında gerekçesiyle birlikte.

Yani bu rapor, "ucundan tutulmuş" bir projeyi değil, "iyi seviyede ama profesyonel olmak için son kalan boşluklar" durumunu betimliyor.
