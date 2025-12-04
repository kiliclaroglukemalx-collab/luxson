# 🔧 CORS Hatası Düzeltme Rehberi

## Sorun
CORS (Cross-Origin Resource Sharing) hatası: `luxson.pages.dev` domain'inden Supabase'e istek yapılamıyor.

## ✅ Çözüm: Supabase CORS Ayarları

### Adım 1: Supabase Dashboard'a Gidin

1. [Supabase Dashboard](https://app.supabase.com) → Projenizi seçin
2. **Settings** → **API** sekmesine gidin

### Adım 2: CORS Ayarlarını Kontrol Edin

1. **"Additional Allowed Origins"** veya **"CORS Settings"** bölümünü bulun
2. Şu domain'i ekleyin:
   ```
   https://luxson.pages.dev
   ```
3. **Save** butonuna tıklayın

### Adım 3: RLS (Row Level Security) Kontrolü

CORS hatası bazen RLS policy'lerinden de kaynaklanabilir:

1. **Authentication** → **Policies** sekmesine gidin
2. `bonuses` tablosu için policy'leri kontrol edin
3. Public access için policy'lerin doğru olduğundan emin olun

### Alternatif: Supabase Client Ayarları

Eğer CORS ayarları yoksa, Supabase otomatik olarak tüm origin'lere izin verir. Sorun devam ederse:

1. Supabase projenizin **Settings** → **General** sekmesine gidin
2. **API URL** ve **anon key**'in doğru olduğundan emin olun
3. Environment variables'ları kontrol edin

## 🔍 Hata Mesajı

```
Access to fetch at 'https://jqsfjrlagtguwhijtwen.supabase.co/rest/v1/bonuses?...' 
from origin 'https://luxson.pages.dev' has been blocked by CORS policy
```

Bu hata, Supabase'in `luxson.pages.dev` domain'ine izin vermediği anlamına gelir.

## ✅ Kontrol Listesi

- [ ] Supabase Dashboard'da CORS ayarları kontrol edildi
- [ ] `https://luxson.pages.dev` domain'i eklendi
- [ ] RLS policy'leri kontrol edildi
- [ ] Environment variables doğru
- [ ] Supabase projesi aktif

## 📝 Not

Supabase'in ücretsiz planında CORS ayarları genellikle otomatik olarak tüm origin'lere izin verir. Eğer hala sorun varsa, Supabase Support'a başvurabilirsiniz.

---

**Önemli**: CORS ayarları değişikliği hemen etkili olur, yeniden deploy gerekmez.


