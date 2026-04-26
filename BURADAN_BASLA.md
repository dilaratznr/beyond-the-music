# 🚀 Buradan Başla — Yayına Alma Rehberi

Bu doküman, projeyi ilk kez yayına çıkaran kişi için kısa bir başlangıç notudur. Tam adım adım rehber için **[DEPLOYMENT.md](./DEPLOYMENT.md)** dosyasını aç.

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

İlk adım: **DEPLOYMENT.md Aşama 1**'e bak, GitHub'da boş bir repo aç.
Sonrasında Neon, R2, Resend ve Vercel adımlarını sırasıyla DEPLOYMENT.md üzerinden takip et.
