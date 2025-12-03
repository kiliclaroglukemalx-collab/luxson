# 🚀 Vercel Deployment Rehberi - LuxeGel Professional

Vercel ile projeyi deploy etmek için adım adım rehber.

## 📋 Ön Gereksinimler

1. ✅ Vercel hesabı (ücretsiz - GitHub ile giriş yapabilirsiniz)
2. ✅ GitHub/GitLab/Bitbucket hesabı
3. ✅ Supabase projesi ve credentials

## 🔧 Adım 1: Projeyi Git Repository'ye Yükleyin

### 1.1. Git Repository Oluşturma

```bash
cd /Users/selimkilcik/Downloads/luxegel-PROFESSIONAL-WITH-EXCEL

# Git repository başlat (eğer yoksa)
git init

# Tüm dosyaları ekle
git add .

# İlk commit
git commit -m "Initial commit: LuxeGel Professional with Excel Export"

# GitHub'da yeni repository oluşturun
# Sonra remote ekleyin:
git remote add origin https://github.com/KULLANICI_ADI/REPO_ADI.git
git branch -M main
git push -u origin main
```

**Not**: Private repository de kullanabilirsiniz, Vercel private repo'ları destekler.

## 🔧 Adım 2: Vercel'e Proje Ekleme

### 2.1. Vercel'e Giriş

1. [Vercel.com](https://vercel.com) adresine gidin
2. **"Sign Up"** veya **"Log In"** butonuna tıklayın
3. **GitHub ile giriş yapın** (en kolay yöntem)

### 2.2. Yeni Proje Oluşturma

1. Dashboard'da **"Add New..."** → **"Project"** butonuna tıklayın
2. **"Import Git Repository"** seçeneğini seçin
3. GitHub hesabınızı bağlayın (ilk kez ise yetkilendirme gerekir)
4. Repository'nizi seçin ve **"Import"** butonuna tıklayın

### 2.3. Proje Ayarları

Vercel otomatik olarak Vite projelerini algılar! Sadece şunları kontrol edin:

**Project Name**: `luxegel-professional` (veya istediğiniz isim)

**Framework Preset**: `Vite` (otomatik algılanır)

**Root Directory**: `./` (proje root'ta ise)

**Build Command**: `npm run build` (otomatik)

**Output Directory**: `dist` (otomatik)

**Install Command**: `npm install` (otomatik)

### 2.4. Environment Variables Ekleme

**ÇOK ÖNEMLİ**: Bu adımı atlamayın!

1. **"Environment Variables"** bölümüne gidin
2. Şu değişkenleri ekleyin:

   **Variable 1:**
   - Name: `VITE_SUPABASE_URL`
   - Value: `https://xxxxx.supabase.co` (Supabase URL'niz)
   - Environment: ✅ Production, ✅ Preview, ✅ Development

   **Variable 2:**
   - Name: `VITE_SUPABASE_ANON_KEY`
   - Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (Supabase anon key'iniz)
   - Environment: ✅ Production, ✅ Preview, ✅ Development

3. Her değişkeni ekledikten sonra **"Add"** butonuna tıklayın

### 2.5. Deploy

1. Tüm ayarları kontrol edin
2. **"Deploy"** butonuna tıklayın
3. İlk build başlayacak (2-5 dakika sürebilir)
4. Build tamamlandığında otomatik olarak bir URL alacaksınız: `https://luxegel-professional.vercel.app`

## 🔧 Adım 3: Custom Domain Bağlama

### 3.1. Domain Ekleme

1. Vercel projenizde **"Settings"** → **"Domains"** sekmesine gidin
2. Domain'inizi girin (örn: `app.luxegel.com` veya `luxegel.com`)
3. **"Add"** butonuna tıklayın

### 3.2. DNS Ayarları

Vercel size DNS kayıtlarını gösterecek:

**Eğer Cloudflare kullanıyorsanız:**

1. Cloudflare Dashboard → DNS → Records
2. Vercel'in gösterdiği kayıtları ekleyin:

   **CNAME kaydı:**
   - Type: `CNAME`
   - Name: `@` (root domain için) veya `app` (subdomain için)
   - Target: `cname.vercel-dns.com`
   - Proxy status: ✅ Proxied (turuncu bulut)

   **veya A kaydı:**
   - Type: `A`
   - Name: `@`
   - Target: `76.76.21.21` (Vercel'in IP'si)
   - Proxy status: ✅ Proxied

3. DNS kayıtları eklendikten sonra birkaç dakika bekleyin
4. Vercel otomatik olarak SSL sertifikası oluşturacak

### 3.3. SSL Sertifikası

- Vercel otomatik olarak Let's Encrypt SSL sertifikası oluşturur
- 5-10 dakika içinde aktif olur
- Cloudflare'de SSL/TLS mode: **"Full"** veya **"Full (strict)"** olmalı

## 🔧 Adım 4: Otomatik Deployment (CI/CD)

### 4.1. Otomatik Deployment

Vercel, Git repository'nize push yaptığınızda otomatik olarak deploy eder:

1. **Settings** → **"Git"** sekmesine gidin
2. **"Production Branch"** ayarını kontrol edin (genellikle `main` veya `master`)
3. Her push'ta otomatik deploy aktif olacak

### 4.2. Preview Deployments

- Her Pull Request için otomatik preview URL oluşturulur
- Preview URL'ler: `https://luxegel-professional-git-branch-name.vercel.app`
- Production'a merge edilmeden önce test edebilirsiniz

## 🔧 Adım 5: Environment Variables Yönetimi

### 5.1. Environment Variables Güncelleme

1. **Settings** → **"Environment Variables"** sekmesine gidin
2. Değişkeni düzenleyin veya yeni ekleyin
3. **"Save"** butonuna tıklayın
4. Yeni bir deployment otomatik olarak başlatılır

### 5.2. Environment Variables Sıralaması

Vercel environment variables'ları şu sırayla kullanır:
1. Production (production branch için)
2. Preview (preview deployments için)
3. Development (local development için)

## 🐛 Sorun Giderme

### Build Hataları

**Hata**: `Command failed: npm run build`

**Çözüm**:
1. Local'de test edin: `npm run build`
2. Build loglarını kontrol edin (Vercel Dashboard → Deployments → Build log)
3. Environment variables'ların doğru olduğundan emin olun
4. `package.json`'daki script'leri kontrol edin

**Hata**: `Module not found` veya import hataları

**Çözüm**:
1. `package.json`'daki tüm bağımlılıkların yüklü olduğundan emin olun
2. `node_modules` cache'ini temizleyin (Vercel otomatik yapar)
3. Build loglarında hangi modülün eksik olduğunu kontrol edin

### Environment Variables Sorunları

**Sorun**: Supabase bağlantı hatası

**Çözüm**:
1. Environment variables'ların doğru eklendiğinden emin olun
2. Değişkenlerin **Production**, **Preview**, ve **Development** için işaretli olduğundan emin olun
3. Değişken isimlerinin doğru olduğundan emin olun (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
4. Yeni bir deployment tetikleyin (değişkenler güncellendikten sonra)

### Domain Bağlantı Sorunları

**Sorun**: Domain çalışmıyor

**Çözüm**:
1. DNS kayıtlarını kontrol edin (Cloudflare Dashboard → DNS)
2. DNS propagation'ın tamamlanmasını bekleyin (5-30 dakika)
3. SSL sertifikasının oluşmasını bekleyin (5-10 dakika)
4. Browser cache'ini temizleyin
5. Vercel Dashboard'da domain durumunu kontrol edin

### Routing Sorunları (404 Hatası)

**Sorun**: Sayfa yenilendiğinde 404 hatası

**Çözüm**:
- `vercel.json` dosyası zaten mevcut ve doğru yapılandırılmış
- Vercel otomatik olarak SPA routing'i handle eder
- Eğer sorun devam ederse, `vercel.json` dosyasını kontrol edin

## 📊 Deployment Durumu

### Deployment Geçmişi

1. Vercel Dashboard → Projeniz → **"Deployments"** sekmesine gidin
2. Tüm deployment'ları görebilirsiniz
3. Her deployment'ın durumunu (Ready/Failed/Building) görebilirsiniz
4. Build loglarını inceleyebilirsiniz
5. Preview URL'lerini görebilirsiniz

### Rollback

Eski bir versiyona geri dönmek için:
1. **Deployments** sekmesine gidin
2. Geri dönmek istediğiniz deployment'ı bulun
3. **"..."** menüsünden **"Promote to Production"** seçin

### Analytics ve Monitoring

Vercel ücretsiz planında:
- ✅ Deployment analytics
- ✅ Build logs
- ✅ Function logs
- ✅ Real-time monitoring

## ✅ Deployment Checklist

Deploy etmeden önce kontrol edin:

- [ ] Git repository'ye push yapıldı
- [ ] `.env` dosyası Git'e eklenmedi (`.gitignore`'da)
- [ ] Environment variables Vercel'de eklendi
- [ ] Local'de `npm run build` başarılı
- [ ] Supabase migration'ları çalıştırıldı
- [ ] Domain DNS ayarları yapıldı (eğer custom domain kullanıyorsanız)
- [ ] SSL sertifikası aktif (otomatik)

## 🎉 Başarılı Deployment Sonrası

Deployment başarılı olduktan sonra:

1. ✅ Production URL'nizi test edin: `https://luxegel-professional.vercel.app`
2. ✅ Tüm sayfaların çalıştığını kontrol edin
3. ✅ Supabase bağlantısını test edin
4. ✅ Excel export özelliğini test edin
5. ✅ Error handling'i test edin
6. ✅ Mobile responsive'i test edin

## 💡 Vercel'in Avantajları

- ✅ **Otomatik HTTPS**: SSL sertifikaları otomatik
- ✅ **Global CDN**: Dünya çapında hızlı erişim
- ✅ **Preview Deployments**: Her PR için preview URL
- ✅ **Otomatik Scaling**: Trafiğe göre otomatik ölçeklendirme
- ✅ **Kolay Rollback**: Tek tıkla eski versiyona dönüş
- ✅ **Analytics**: Ücretsiz analytics ve monitoring
- ✅ **Serverless Functions**: İhtiyaç halinde backend fonksiyonları ekleyebilirsiniz

## 📞 Yardım

Sorun yaşarsanız:
- Vercel Dokümantasyonu: https://vercel.com/docs
- Vercel Community: https://github.com/vercel/vercel/discussions
- Build loglarını inceleyin (en önemli kaynak!)
- Vercel Support: Dashboard'dan ticket açabilirsiniz

---

**Not**: İlk deployment 2-5 dakika sürebilir. Sonraki deployment'lar genellikle 1-3 dakika sürer.

**İpucu**: Vercel CLI kullanarak da deploy edebilirsiniz:
```bash
npm i -g vercel
vercel
```

