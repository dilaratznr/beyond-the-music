# Beyond The Music — Deployment Rehberi

Bu rehber projeyi sıfırdan canlı ortama taşımak için yazılmıştır. Teknik bilgi gerektirmez — her adım tam olarak nerede ne tıklanacağını söyler.

**Kullanılacak servisler (hepsi ücretsiz tier'da başlar):**

- **GitHub** — kod deposu
- **Vercel** — hosting (Next.js'in kendi şirketi)
- **Neon** — PostgreSQL veritabanı
- **Cloudflare R2** — resim depolama
- **Resend** — şifre sıfırlama mailleri

**Tahmini süre:** 45 dakika (ilk kez yapıyorsan)

---

## Aşama 1 — GitHub'a kodu yükle

### 1a) GitHub'da boş repo oluştur

1. https://github.com/new adresine git
2. **Repository name:** `beyond-the-music`
3. **Private** seç (site yayınlanana kadar kodun gizli kalsın)
4. **"Add a README file", "Add .gitignore", "Add a license"** üçünü de **işaretleme** — boş repo oluştur
5. **Create repository** tıkla
6. Açılan sayfada gördüğün URL'yi kopyala. Şu formatta: `https://github.com/dilaratznr/beyond-the-music.git`

### 1b) Kodu push et — iki seçenek

**Kolay yol: GitHub Desktop (teknik bilgi gerektirmez)**

1. https://desktop.github.com adresinden indir, kur
2. Aç → **File → Add Local Repository**
3. `beyond-the-music` klasörünü seç
4. Uygulama "bu boş bir git deposu" diye sorar → devam et
5. Sol tarafta tüm değişiklikler görünecek → alt kısımda commit mesajı yaz: `İlk yükleme`
6. **Commit to main** → **Publish repository** → "Keep this code private" işaretli olsun → **Publish Repository**

**Terminal yolu (macOS / Linux için — Windows'ta Git Bash'te)**

Klasör terminali'ni aç (Mac: klasöre sağ tık → Services → New Terminal at Folder). Şu komutları **sırayla** yapıştır:

```bash
rm -f .git/index.lock
git add .
git commit -m "İlk yükleme"
git branch -M main
git remote add origin https://github.com/dilaratznr/beyond-the-music.git
git push -u origin main
```

> Son komutta GitHub kullanıcı adı + şifre ister. Şifre yerine **Personal Access Token** istiyor — GitHub profil → Settings → Developer settings → Personal access tokens → Generate new token (classic) → `repo` iznini ver, kopyala, şifre olarak yapıştır.

URL'yi kendi reponun URL'i ile değiştir. Terminalden kimlik doğrulama kafa karıştırırsa GitHub Desktop'ı tercih et — GUI ile tek tıkla giriş yapar.

---

## Aşama 2 — Neon veritabanı oluştur

1. https://neon.tech/ → **Sign up** → **Continue with GitHub** (aynı hesabı kullan)
2. İlk kez giriş → proje adı: `beyond-the-music`, region: **Europe (Frankfurt)** (Türkiye'ye en yakın)
3. Dashboard'da **Connection string** kutusunu bul
4. **"Pooled connection"** seçeneğini seç (bu önemli — serverless için)
5. Stringi kopyala — şu formatta olmalı:
   ```
   postgresql://neondb_owner:xxxx@ep-xxx-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require
   ```
6. Bu stringi bir not defterine yapıştır — birazdan Vercel'e girerken kullanacağız.

---

## Aşama 3 — Cloudflare R2 (resim deposu) kur

1. https://dash.cloudflare.com/sign-up → hesap aç
2. Sol menüden **R2 Object Storage** → **"Turn on R2"** tıkla
3. Sorulursa ücretsiz plan (kredi kartı ister ama aylık 10 GB'a kadar kesmez)
4. **"Create bucket"** → ad: `beyond-the-music-images`, region: **Eastern Europe (EEUR)**
5. Oluşan bucket'a gir → **Settings** sekmesi → **Public Access** → **"Allow Access"** (R2.dev subdomain'i aç)
6. Açılan public URL'yi kopyala (örn. `https://pub-abc123.r2.dev`)
7. Sol menüden **R2** → **"Manage R2 API Tokens"** → **"Create API Token"**
   - Token name: `beyond-the-music`
   - Permissions: **Object Read & Write**
   - Specify buckets: önceden oluşturduğun `beyond-the-music-images`
   - **Create API Token**
8. Açılan ekranda göreceğin **4 değeri** not defterine kopyala:
   - Access Key ID
   - Secret Access Key
   - Endpoint (jurisdiction specific olanı seç — `https://<account-id>.r2.cloudflarestorage.com`)
   - Public URL (5. adımda kopyaladığın)

> ⚠️ Secret Access Key bir daha gösterilmez. Mutlaka not al.

---

## Aşama 4 — Resend (email) kur

1. https://resend.com/signup → **Continue with GitHub**
2. İlk ekranda **"Add API Key"** → isim: `beyond-the-music` → **Create**
3. Gelen `re_xxxxxxxxxxxxxx` ile başlayan key'i kopyala

> Domain doğrulaması ileri adımda yapılacak. Şimdilik test için `onboarding@resend.dev` adresinden mail gönderebilirsin.

---

## Aşama 5 — Vercel'e deploy

1. https://vercel.com/signup → **Continue with GitHub**
2. Dashboard'da **"Add New..." → "Project"**
3. GitHub reposu listesinde `beyond-the-music`'i bul → **Import**
4. **Framework Preset:** Next.js (otomatik algılar)
5. **Environment Variables** bölümünü aç. Her satıra bir değer gir:

| Name | Value |
|------|-------|
| `DATABASE_URL` | Neon'dan aldığın connection string |
| `NEXTAUTH_URL` | `https://beyond-the-music.vercel.app` (ilk deploy URL'si; domain bağlanınca güncellenecek) |
| `NEXTAUTH_SECRET` | 32 karakter rastgele string — üret: https://generate-secret.vercel.app/32 |
| `NEXT_PUBLIC_APP_URL` | NEXTAUTH_URL ile aynı |
| `GEMINI_API_KEY` | (opsiyonel) https://aistudio.google.com/apikey — çeviri için |
| `AWS_ACCESS_KEY_ID` | R2 Access Key ID |
| `AWS_SECRET_ACCESS_KEY` | R2 Secret Access Key |
| `AWS_S3_BUCKET_NAME` | `beyond-the-music-images` |
| `AWS_REGION` | `auto` |
| `AWS_S3_ENDPOINT_URL` | R2 endpoint URL'si |
| `AWS_S3_PUBLIC_DOMAIN` | R2 public URL (`https://pub-xxx.r2.dev`) |
| `SMTP_HOST` | `smtp.resend.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | `resend` |
| `SMTP_PASSWORD` | `re_xxx...` (Resend key) |
| `SMTP_FROM` | `Beyond The Music <onboarding@resend.dev>` (domain doğrulanana kadar) |

6. **Deploy** tıkla. 2-3 dakika sürer.

---

## Aşama 6 — İlk admin kullanıcısını oluştur

Deploy başarılı olduktan sonra ilk Super Admin'i `prisma/seed.ts` ile oluşturuyoruz. Seed script'i, **güçlü bir şifre env'i olmadan çalışmıyor** (hardcoded default şifre yok — `password-policy.ts`'in yasakladığı değerlerle çelişme olmasın diye).

1. Lokalde bir kez çalıştırmak için (terminal):

   ```bash
   SEED_ADMIN_USERNAME="admin" \
   SEED_ADMIN_NAME="Adın Soyadın" \
   SEED_ADMIN_PASSWORD="<en az 12 karakter, güçlü>" \
   # Email opsiyonel; SMTP/domain hazır değilse boş bırak:
   # SEED_ADMIN_EMAIL="your-email@example.com" \
   npx prisma db seed
   ```

   Username zorunlu (login'de kullanılacak); 3-30 karakter, küçük harf + rakam + `_` veya `-`.
   Script idempotent: DB'de zaten kullanıcı varsa atlar.

2. Production'da (Vercel) çalıştırmak için:
   - Vercel → projen → **Settings** → **Environment Variables** → `SEED_ADMIN_USERNAME`, `SEED_ADMIN_NAME`, `SEED_ADMIN_PASSWORD` ekle (Production scope, Sensitive olarak). Email opsiyonel.
   - Local terminalde: `npx vercel env pull && SEED_ADMIN_PASSWORD="..." npx prisma db seed`
   - Seed başarılı olunca env'leri Vercel'den **silebilirsin** — bir daha gerek yok.

3. Sonrasında `https://beyond-the-music.vercel.app/tr/admin/login` adresinden gir (kullanıcı adınla), **Settings → Şifre Değiştir**'den şifreni rotate et.

---

## Aşama 7 — Domain bağla

1. Vercel → projen → **Settings** → **Domains**
2. **Add** → domain adresini yaz (örn. `beyondthemusic.com`)
3. Vercel iki DNS kaydı gösterir:
   - `A` kaydı: `76.76.21.21`
   - `CNAME` kaydı: `cname.vercel-dns.com`
4. Domain aldığın şirketin DNS paneline gir (GoDaddy, Natro, Namecheap vs.), bu kayıtları ekle.
5. Değişiklik 5 dakika - 24 saat arası aktif olur. Vercel otomatik SSL (https) kuracak.
6. Domain aktif olunca Vercel → Environment Variables → `NEXTAUTH_URL` ve `NEXT_PUBLIC_APP_URL` değerlerini yeni domain ile güncelle (`https://beyondthemusic.com`).
7. **Deployments** sekmesinden son deploy'u "Redeploy" yap — yeni env vars aktifleşsin.

---

## Aşama 8 — Email domain doğrulama (opsiyonel ama önerilir)

Şifre sıfırlama maillerinin spam'e düşmemesi için:

1. Resend dashboard → **Domains** → **Add Domain** → `yourdomain.com`
2. Resend'in verdiği 3 DNS kaydını (TXT + CX + CNAME) domain DNS paneline ekle
3. Doğrulama tamamlanınca **Vercel → `SMTP_FROM`** değişkenini güncelle:
   `Beyond The Music <no-reply@yourdomain.com>`
4. Redeploy.

---

## Sorun giderme

**Deploy "Build failed" veriyor:**
Logları oku. En sık sebep: env var eksik veya `DATABASE_URL` Neon "Pooled" değil "Direct" connection kullanıyor. Pooled olana geç.

**Admin'e giriş yapamıyorum:**
`NEXTAUTH_SECRET` eksik veya boş. En az 32 karakter olmalı.

**Resim upload başarısız:**
R2 token'ının bucket için Read & Write yetkisi olmalı. `AWS_S3_ENDPOINT_URL` formatı `https://<id>.r2.cloudflarestorage.com` olmalı — sonuna bucket adı ekleme.

**Makale önizlemeleri domain'i göstermiyor:**
`NEXT_PUBLIC_APP_URL` güncel mi kontrol et. Değiştirdiysen Redeploy şart.

---

## Kod güncelledikten sonra yeni deploy

GitHub'a push yaptığın anda Vercel otomatik algılar ve yeni deploy başlatır. 2-3 dakikada canlıya yansır.

- **main** branch → production (yourdomain.com)
- Başka branch'ler → "Preview" URL'si (her branch için ayrı test URL'i)

Bu sayede istediğin zaman test branch'inde değişiklik deneyebilir, beğenirsen main'e merge edersin.
