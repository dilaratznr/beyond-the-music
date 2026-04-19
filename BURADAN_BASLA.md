# 🚀 Buradan Başla — Yayına Alma Rehberi

Selam Dilara,

Site production'a hazır. Tam adım adım rehber için **[DEPLOYMENT.md](./DEPLOYMENT.md)** dosyasını aç.

## Kısa özet

Sırayla yapılacaklar:

1. **GitHub'da boş repo aç** → `beyond-the-music`, private
2. **GitHub Desktop** veya terminal ile kodu push et
3. **Neon**'da PostgreSQL veritabanı oluştur → connection string'i al
4. **Cloudflare R2**'de resim bucket'ı aç → 4 değer al (access key, secret, endpoint, public URL)
5. **Resend**'de hesap aç → API key al
6. **Vercel**'e git → GitHub reposunu import et → yukarıdaki bütün değerleri environment variables'a yapıştır → Deploy
7. **Domain'i bağla** → DNS panelinden A ve CNAME kayıtları ekle

Hepsi ücretsiz tier'da başlar. Yıllık toplam maliyet: sadece domain ücreti.

## Sırada ne var?

Şu an yapman gereken: **DEPLOYMENT.md Aşama 1**'e bak, GitHub'da repo aç.

Sonrasında bana "GitHub reposunu açtım, URL'i: …" yaz. Ben de kalan kısımları (Neon, R2, Resend, Vercel) tek tek seninle aşıp, env variables'ı eksiksiz hazırlayacağım.

Takıldığın her yerde sor.
