# 🚀 Cloudflare Pages Deployment Rehberi

Bu rehber, LuxeGel Professional projesini Cloudflare Pages'e deploy etmek için adım adım talimatlar içerir.

## 📋 Ön Gereksinimler

1. ✅ Cloudflare hesabı (ücretsiz)
2. ✅ GitHub/GitLab/Bitbucket hesabı (kodunuzu saklamak için)
3. ✅ Supabase projesi ve credentials
4. ✅ Domain (Cloudflare'de yönetiliyor)

## 🔧 Adım 1: Projeyi Git Repository'ye Yükleyin

### 1.1. Git Repository Oluşturma

Eğer henüz Git repository'niz yoksa:

```bash
cd /Users/selimkilcik/Downloads/luxegel-PROFESSIONAL-WITH-EXCEL

# Git repository başlat
git init

# Tüm dosyaları ekle
git add .

# İlk commit
git commit -m "Initial commit: LuxeGel Professional with Excel Export"

# GitHub'da yeni repository oluşturun, sonra:
git remote add origin https://github.com/KULLANICI_ADI/REPO_ADI.git
git branch -M main
git push -u origin main
```

**Not**: GitHub'da private repository oluşturabilirsiniz, Cloudflare Pages private repo'ları da destekler.

## 🔧 Adım 2: Cloudflare Pages'e Proje Ekleme

### 2.1. Cloudflare Dashboard'a Giriş

1. [Cloudflare Dashboard](https://dash.cloudflare.com) adresine gidin
2. Hesabınıza giriş yapın

### 2.2. Pages Projesi Oluşturma

1. Sol menüden **"Pages"** sekmesine tıklayın
2. **"Create a project"** butonuna tıklayın
3. **"Connect to Git"** seçeneğini seçin
4. GitHub/GitLab/Bitbucket hesabınızı bağlayın (ilk kez ise yetkilendirme gerekir)
5. Repository'nizi seçin

### 2.3. Build Ayarları

Cloudflare Pages otomatik olarak Vite projelerini algılar, ama manuel ayarlamak isterseniz:

**Project name**: `luxegel-professional` (veya istediğiniz isim)

**Production branch**: `main` (veya `master`)

**Build settings**:
- **Framework preset**: `Vite`
- **Build command**: `npm run build`
- **Build output directory**: `dist`
- **Root directory**: `/` (proje root'ta ise)

**Environment variables** ekleyin:
```
VITE_SUPABASE_URL = your_supabase_url_here
VITE_SUPABASE_ANON_KEY = your_supabase_anon_key_here
```

**Önemli**: Environment variables'ları burada eklemeniz gerekiyor!

### 2.4. Deploy

1. **"Save and Deploy"** butonuna tıklayın
2. İlk build başlayacak (5-10 dakika sürebilir)
3. Build tamamlandığında otomatik olarak bir URL alacaksınız: `https://luxegel-professional.pages.dev`

## 🔧 Adım 3: Custom Domain Bağlama

### 3.1. Domain Ayarları

1. Cloudflare Pages projenizde **"Custom domains"** sekmesine gidin
2. **"Set up a custom domain"** butonuna tıklayın
3. Domain'inizi girin (örn: `app.luxegel.com` veya `luxegel.com`)

### 3.2. DNS Ayarları

Cloudflare otomatik olarak DNS kayıtlarını ekleyecek. Eğer manuel eklemeniz gerekirse:

**CNAME kaydı ekleyin:**
- **Type**: `CNAME`
- **Name**: `@` (root domain için) veya `app` (subdomain için)
- **Target**: `luxegel-professional.pages.dev`
- **Proxy status**: Proxied (turuncu bulut) ✅

**Not**: Cloudflare'de domain yönetiyorsanız, otomatik olarak eklenir.

### 3.3. SSL/TLS Ayarları

1. Cloudflare Dashboard > **SSL/TLS** sekmesine gidin
2. **Encryption mode**: **"Full"** veya **"Full (strict)"** seçin
3. SSL sertifikası otomatik olarak oluşturulur (birkaç dakika sürebilir)

## 🔧 Adım 4: Environment Variables Kontrolü

### 4.1. Production Environment Variables

1. Cloudflare Pages projenizde **"Settings"** > **"Environment variables"** sekmesine gidin
2. Şu değişkenlerin eklendiğinden emin olun:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

3. **Production**, **Preview**, ve **Branch previews** için işaretleyin

### 4.2. Değişkenleri Güncelleme

Eğer değişkenleri güncellemeniz gerekirse:
1. Değişkeni düzenleyin
2. **"Save"** butonuna tıklayın
3. Yeni bir deployment tetikleyin (Settings > Triggers > Retry deployment)

## 🔧 Adım 5: Otomatik Deployment (CI/CD)

### 5.1. Otomatik Deployment Ayarları

Cloudflare Pages, Git repository'nize push yaptığınızda otomatik olarak deploy eder:

1. **Settings** > **"Builds & deployments"** sekmesine gidin
2. **"Automatic deployments"** aktif olduğundan emin olun
3. Hangi branch'lerin deploy edileceğini seçin (genellikle `main`)

### 5.2. Preview Deployments

Her Pull Request için otomatik preview deployment oluşturulur. Bu özelliği kapatmak isterseniz Settings'den kapatabilirsiniz.

## 🔧 Adım 6: Build Optimizasyonu (Opsiyonel)

### 6.1. Build Cache

Cloudflare Pages otomatik olarak `node_modules` cache'ler. Ek optimizasyon için:

1. **Settings** > **"Builds & deployments"** sekmesine gidin
2. **"Build cache"** ayarlarını kontrol edin

### 6.2. Build Timeout

Varsayılan build timeout 20 dakikadır. Eğer build'iniz uzun sürüyorsa, Cloudflare Support'a başvurabilirsiniz.

## 🐛 Sorun Giderme

### Build Hataları

**Hata**: `Command failed: npm run build`

**Çözüm**:
1. Local'de test edin: `npm run build`
2. Build loglarını kontrol edin (Cloudflare Pages > Deployments > Build log)
3. Environment variables'ların doğru olduğundan emin olun

**Hata**: `Module not found` veya import hataları

**Çözüm**:
1. `package.json`'daki tüm bağımlılıkların yüklü olduğundan emin olun
2. `node_modules` cache'ini temizleyin (Settings > Builds > Clear build cache)

### Domain Bağlantı Sorunları

**Sorun**: Domain çalışmıyor

**Çözüm**:
1. DNS kayıtlarını kontrol edin (CNAME doğru mu?)
2. SSL sertifikasının oluştuğunu kontrol edin (birkaç dakika bekleyin)
3. Browser cache'ini temizleyin

### Environment Variables Sorunları

**Sorun**: Supabase bağlantı hatası

**Çözüm**:
1. Environment variables'ların doğru eklendiğinden emin olun
2. Değişkenlerin **Production** için işaretli olduğundan emin olun
3. Yeni bir deployment tetikleyin (değişkenler güncellendikten sonra)

## 📊 Deployment Durumu

### Deployment Geçmişi

1. Cloudflare Pages projenizde **"Deployments"** sekmesine gidin
2. Tüm deployment'ları görebilirsiniz
3. Her deployment'ın durumunu (Success/Failed) görebilirsiniz
4. Build loglarını inceleyebilirsiniz

### Rollback

Eski bir versiyona geri dönmek için:
1. **Deployments** sekmesine gidin
2. Geri dönmek istediğiniz deployment'ı bulun
3. **"..."** menüsünden **"Retry deployment"** veya **"Rollback to this deployment"** seçin

## ✅ Deployment Checklist

Deploy etmeden önce kontrol edin:

- [ ] Git repository'ye push yapıldı
- [ ] `.env` dosyası Git'e eklenmedi (`.gitignore`'da)
- [ ] Environment variables Cloudflare'de eklendi
- [ ] Local'de `npm run build` başarılı
- [ ] Supabase migration'ları çalıştırıldı
- [ ] Domain DNS ayarları yapıldı
- [ ] SSL sertifikası aktif

## 🎉 Başarılı Deployment Sonrası

Deployment başarılı olduktan sonra:

1. ✅ Production URL'nizi test edin
2. ✅ Tüm sayfaların çalıştığını kontrol edin
3. ✅ Supabase bağlantısını test edin
4. ✅ Excel export özelliğini test edin
5. ✅ Error handling'i test edin

## 📞 Yardım

Sorun yaşarsanız:
- Cloudflare Pages dokümantasyonu: https://developers.cloudflare.com/pages/
- Cloudflare Community: https://community.cloudflare.com/
- Build loglarını inceleyin (en önemli kaynak!)

---

**Not**: İlk deployment 5-10 dakika sürebilir. Sonraki deployment'lar genellikle 2-5 dakika sürer.

