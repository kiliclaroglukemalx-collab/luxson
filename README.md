# LuxeGel Professional - Excel Export System

Bonus ve çekim kontrol sistemi için profesyonel Excel export özellikleri içeren React + TypeScript uygulaması.

## 🚀 Özellikler

- ✅ **Profesyonel Excel Export**: Gelişmiş formatlama, renk şemaları ve özelleştirilebilir şablonlar
- ✅ **Performans Raporları**: Personel ve ödeme sistemi performans analizleri
- ✅ **Vardiya Planlama**: Aylık vardiya yönetimi
- ✅ **Bonus Takip Sistemi**: Bonus kuralları ve kullanım takibi
- ✅ **Supabase Entegrasyonu**: Güvenli veritabanı yönetimi
- ✅ **Error Handling**: Merkezi hata yönetimi ve Error Boundary
- ✅ **Test Coverage**: Unit ve component testleri

## 📋 Gereksinimler

- Node.js 18+ 
- npm veya yarn
- Supabase hesabı ve projesi

## 🔧 Kurulum

1. **Projeyi klonlayın veya indirin**

2. **Bağımlılıkları yükleyin:**
   ```bash
   npm install
   ```

3. **Environment değişkenlerini ayarlayın:**
   ```bash
   cp env.example .env
   ```
   
   `.env` dosyasını düzenleyip Supabase bilgilerinizi ekleyin:
   ```env
   VITE_SUPABASE_URL=your_supabase_url_here
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
   ```

4. **Supabase migration'larını çalıştırın:**
   - Supabase Dashboard > SQL Editor'a gidin
   - `supabase/migrations/` klasöründeki tüm `.sql` dosyalarını sırayla çalıştırın

5. **Development server'ı başlatın:**
   ```bash
   npm run dev
   ```

## 🧪 Testler

### Testleri çalıştırma:
```bash
# Tüm testleri çalıştır
npm test

# Test UI ile çalıştır
npm run test:ui

# Coverage raporu oluştur
npm run test:coverage
```

### Test yapısı:
- `src/test/utils/` - Utility fonksiyon testleri
- `src/test/components/` - Component testleri

## 📦 Build

Production build oluşturmak için:
```bash
npm run build
```

Build dosyaları `dist/` klasörüne oluşturulur.

## 🏗️ Proje Yapısı

```
src/
├── components/          # React component'leri
│   ├── ExcelExportPanel.tsx
│   ├── PerformanceReports.tsx
│   ├── ErrorBoundary.tsx
│   └── ...
├── lib/                # Kütüphane konfigürasyonları
│   └── supabase.ts
├── pages-personel/    # Personel sayfaları
├── utils/             # Utility fonksiyonlar
│   ├── professionalExcelExport.ts
│   ├── excelProcessor.ts
│   └── errorHandler.ts
└── test/              # Test dosyaları
    ├── setup.ts
    ├── utils/
    └── components/
```

## 🔑 Önemli Dosyalar

- `src/utils/professionalExcelExport.ts` - Excel export mantığı
- `src/components/ExcelExportPanel.tsx` - Excel export UI
- `src/utils/errorHandler.ts` - Merkezi hata yönetimi
- `src/components/ErrorBoundary.tsx` - React Error Boundary
- `vitest.config.ts` - Test konfigürasyonu

## 🐛 Hata Ayıklama

### Yaygın Sorunlar

1. **xlsx-js-style hatası:**
   ```bash
   npm install xlsx-js-style
   ```

2. **Supabase bağlantı hatası:**
   - `.env` dosyasının doğru doldurulduğundan emin olun
   - Supabase projenizin aktif olduğunu kontrol edin

3. **TypeScript hataları:**
   ```bash
   npm run typecheck
   ```

## 📝 Geliştirme Notları

- TypeScript strict mode aktif
- ESLint kuralları yapılandırılmış
- Tailwind CSS kullanılıyor
- React 18+ özellikleri kullanılıyor

## 🤝 Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit yapın (`git commit -m 'Add amazing feature'`)
4. Push yapın (`git push origin feature/amazing-feature`)
5. Pull Request açın

## 📄 Lisans

Bu proje özel bir projedir.

## 👤 İletişim

Sorularınız için issue açabilirsiniz.

---

**Not**: Bu proje aktif geliştirme aşamasındadır. Production'a almadan önce tüm testleri çalıştırdığınızdan emin olun.


