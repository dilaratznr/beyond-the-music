# Veritabanı migration stratejisi

## Şu anki durum

`package.json` build script'i artık şu hali aldı:

```
prisma generate && npx tsx scripts/migrate-add-username.ts && prisma db push --skip-generate && next build
```

**Değişen:** `--accept-data-loss` bayrağı kaldırıldı.

**Etkisi:**

- Schema'da bir kolon **silindiğinde** veya bir kolonun **tipi değiştirildiğinde** (örn. `String?` → `String`), Prisma artık build sırasında ABORT eder. "Bu değişiklik veri kaybına yol açabilir" hatasıyla deploy durur.
- Bu **istenen** davranıştır — sessizce veri silen build yerine "dur, bunu görünür yap" diyen build.
- Eğer bilinçli olarak destructive bir migration gerekiyorsa: o sefer için yerelde `npx prisma db push --accept-data-loss` ile DB'yi manuel uyumla, sonra yeni schema'yla normal deploy et.

Bu, K2'nin **immediate safety** kısmı. Aşağıdaki adımlar (baseline migration'a geçiş) **uzun vadeli doğru çözüm** ama acil değil.

## Uzun vadeli: `prisma db push` → `prisma migrate deploy`

`prisma db push` declarative bir araç — schema'yı DB'ye yansıtır ama **migration history tutmaz**. `prisma migrate` ise her schema değişikliğini SQL dosyası olarak commit'ler; staging ile production arasında "şu an hangi migration'a kadar geldik" sorusuna kesin cevap verir.

### Geçiş adımları (tek seferlik)

**1) Yerelde mevcut production schema'sıyla bir baseline migration oluştur:**

```bash
# Production DB URL'i ile (Vercel → Settings → Environment Variables'tan kopyala):
export PROD_DATABASE_URL="postgresql://..."

# prisma/migrations/0000_init/ klasörünü oluştur:
mkdir -p prisma/migrations/0000_init

# Mevcut schema.prisma'yı SQL'e çevir:
npx prisma migrate diff \
  --from-empty \
  --to-schema-datamodel prisma/schema.prisma \
  --script > prisma/migrations/0000_init/migration.sql

# Migration'ı production DB'sinde "uygulanmış" olarak işaretle
# (gerçekten çalıştırma — schema zaten orada):
npx prisma migrate resolve --applied 0000_init
```

**2) `_prisma_migrations` tablosunun oluştuğunu doğrula:**

```bash
psql $PROD_DATABASE_URL -c "SELECT migration_name, applied_steps_count FROM _prisma_migrations;"
```

Beklenen çıktı: bir satır, `0000_init`, applied_steps_count=1.

**3) `package.json` build script'ini güncelle:**

```diff
- "build": "prisma generate && npx tsx scripts/migrate-add-username.ts && prisma db push --skip-generate && next build",
+ "build": "prisma generate && prisma migrate deploy && next build",
```

`migrate-add-username.ts` çağrısı artık gereksiz — schema'da `username` zaten var, eski user'lar zaten doldurulmuş. Script'i `scripts/_archived/` altına taşı veya sil.

**4) Geliştirme akışı değişiyor:**

- Schema değişikliği yapacaksan:
  ```
  # Önce prisma/schema.prisma'yı düzenle
  npx prisma migrate dev --name describe_the_change
  # Yeni bir migration klasörü oluşur: prisma/migrations/<timestamp>_describe_the_change/
  # Commit ediyorsun.
  ```
- Production deploy'da `prisma migrate deploy` otomatik en yeni migration'a kadar koşar.

### Doğrulama

İlk migration deploy'undan sonra:

```bash
# Staging environment'ta önce dene:
DATABASE_URL=$STAGING_URL npx prisma migrate deploy

# Production:
DATABASE_URL=$PROD_DATABASE_URL npx prisma migrate deploy
```

Vercel'de `prisma migrate deploy` build script'inden tetiklenecek; manuel komut gerekmiyor.

### Geri dönüş (rollback)

Prisma `migrate deploy` rollback'i otomatik yapmaz. Geri almak gerekirse:

1. Migration SQL'inin tersini yazan yeni bir `migration.sql` oluştur (örn. `prisma/migrations/<ts>_revert_xxx/`).
2. Yeni schema.prisma'yı eski haline çevir.
3. Yeni migration'ı commit + deploy et.

Bu yüzden production migration'lar **her zaman küçük, geri-alınabilir, ve önce staging'de denenmiş** olmalı.

## Sorun çıkarsa

- "Migration already applied" — `_prisma_migrations` tablosunda zaten o ad var. `prisma migrate resolve --rolled-back <name>` ile temizle.
- "Database is not empty" baseline öncesi — `--from-empty` yerine `--from-url $PROD_DATABASE_URL` kullan.
- Production'a baseline öncesi `prisma migrate dev` koşma — `_prisma_migrations` tablosunu bozar. Sadece `migrate deploy` veya `migrate resolve` kullan.
