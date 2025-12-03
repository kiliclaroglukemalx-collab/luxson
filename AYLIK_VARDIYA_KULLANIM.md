# 📅 Aylık Vardiya Yönetim Sistemi

## 🎯 Özellikler

### ✨ Otomatik Vardiya Oluşturma
- **Bir tıkla** tüm ayın vardiyalarını otomatik oluştur
- Personeller rotasyon sırasına göre döngüsel olarak atanır
- Gece vardiyası sonrası **otomatik izin** ataması

### 🌙 Gece Vardiyası Özel Kuralları
- **Gece vardiyası**: 01:00 - 09:00 
- Gece vardiyası biten personel **1 hafta** boyunca başka gece vardiyası almaz
- Sonraki haftanın **Pazartesi ve Salı** günleri **otomatik izinli**

### ✏️ Manuel Düzenleme
- Herhangi bir günü tıklayarak düzenle
- Personel değiştir
- Vardiya saati değiştir
- İzin olarak işaretle
- Yeni vardiya ekle
- Vardiya sil

### 📊 İki Görünüm Modu
1. **Aylık Plan** - Tüm ayı hafta hafta görüntüle
2. **Haftalık Detay** - Mevcut haftalık vardiya sistemi (görev atamaları ile)

---

## 🚀 Kullanım Kılavuzu

### 1️⃣ Otomatik Vardiya Planı Oluşturma

```
1. Vardiya Yönetimi sayfasını aç
2. Aylık Plan sekmesine gel
3. İstediğin ayı seç (◀ ve ▶ ok tuşları ile)
4. "Otomatik Oluştur" butonuna tıkla
5. Bekle... ✨
6. Tüm ay planlandı!
```

**Not:** Otomatik oluşturma mevcut atamaları siler ve yeniden oluşturur.

---

### 2️⃣ Manuel Düzenleme

#### Vardiya Düzenle:
```
1. Düzenlemek istediğin vardiya kartına tıkla
2. Modal açılır
3. Personeli değiştir (gerekirse)
4. Vardiya saatini değiştir
5. "Kaydet" butonuna tıkla
```

#### Yeni Vardiya Ekle:
```
1. İstediğin günün altındaki "+" butonuna tıkla
2. Personel seç
3. Vardiya saati seç
4. "Kaydet" butonuna tıkla
```

#### Vardiya Sil:
```
1. Silinecek vardiyaya tıkla
2. Modal açılır
3. Çöp kutusu ikonuna tıkla
4. Vardiya silindi ✓
```

#### İzin Ata:
```
1. İzin vermek istediğin günde vardiyaya tıkla
2. "İzinli" seçeneğini seç
3. "Kaydet"
```

---

### 3️⃣ Rotasyon Sırası Ayarlama

Personellerin vardiyalara atanma sırası:

```
1. Admin panelinden "Employees" tablosuna git
2. Her personel için "shift_rotation_order" değerini ayarla
3. Düşük numara = Önce atanır
4. Aynı numara = Ekleme sırasına göre
```

**Örnek:**
```
Ahmet - shift_rotation_order: 1
Mehmet - shift_rotation_order: 2
Ayşe - shift_rotation_order: 3

Sonuç: Ahmet → Mehmet → Ayşe → Ahmet → ...
```

---

## 🌙 Gece Vardiyası Mantığı

### Nasıl Çalışır?

1. **Gece vardiyası atanır**: (01:00 - 09:00)
   ```
   Ahmet - Pazartesi gece 01:00-09:00
   ```

2. **1 hafta gece yasağı**:
   ```
   Ahmet bir sonraki 7 gün boyunca gece vardiyası almaz
   ```

3. **Otomatik izin** (Pazartesi-Salı):
   ```
   Gece vardiyası bittiğinde, sonraki haftanın:
   - Pazartesi: İzinli
   - Salı: İzinli
   
   Ahmet:
   - Pzt gece: Vardiya (01:00-09:00)
   - Salı: Normal gün
   - Çarş: Normal gün
   - Perş: Normal gün
   - Cuma: Normal gün
   - Cumartesi: Normal gün
   - Pazar: Normal gün
   - PZT (sonraki hafta): İZİNLİ 🏖️
   - SALI (sonraki hafta): İZİNLİ 🏖️
   ```

### Manuel Müdahale

Otomatik kurallar seni bağlamaz! İstersen:
- Gece vardiyası sonrası izni iptal et
- Farklı günlerde izin ver
- Aynı personele tekrar gece ver

**Not:** Manuel değişiklik yaptığında otomatik kurallar devre dışı kalır.

---

## 📊 Vardiya Tipleri ve Renkleri

| Vardiya | Saat | Renk | Özel |
|---------|------|------|------|
| Sabah | 09:00 - 17:00 | 🔵 Mavi | - |
| Öğle | 12:00 - 20:00 | 🟢 Yeşil | - |
| Akşam 1 | 18:00 - 02:00 | 🟠 Turuncu | - |
| Akşam 2 | 17:00 - 01:00 | 🟣 Mor | - |
| **Gece** | **01:00 - 09:00** | 🔴 **Kırmızı** | **Özel kurallar** |
| İzinli | - | ⚪ Gri | İzin günü |

---

## 💡 İpuçları

### ✅ En İyi Uygulamalar

1. **İlk kurulum**:
   - Önce personellere rotasyon sırası ata
   - Sonra otomatik oluştur
   - Sonra manuel düzeltmeler yap

2. **Aylık planlama**:
   - Her ayın başında otomatik oluştur
   - Özel günleri manuel düzenle (bayramlar, etkinlikler)
   - Haftalık sekmeden görev atamaları yap

3. **Gece vardiyası**:
   - Otomatik izinleri kontrol et
   - Gerekirse manuel düzenle
   - 1 hafta kuralına dikkat et

### ⚠️ Dikkat Edilmesi Gerekenler

- **Otomatik oluşturma mevcut planı siler**
- Manuel değişiklikler kaybolur
- Önce yedek al veya not et
- Görev atamaları korunur (silinmez)

---

## 🔧 Sorun Giderme

### Problem: "Aktif personel bulunamadı"
**Çözüm:** 
- Employees tablosunda aktif personel var mı kontrol et
- `active = true` olan personel olmalı

### Problem: Gece vardiyası sonrası izin atanmıyor
**Çözüm:**
- Veritabanında `is_off_day` kolonu var mı kontrol et
- Migration'ı çalıştır
- Otomatik oluşturmayı tekrar dene

### Problem: Rotasyon çalışmıyor
**Çözüm:**
- `shift_rotation_order` değerlerini kontrol et
- NULL veya 999 olanları güncelle
- Sıralama: 1, 2, 3, 4...

### Problem: Değişiklikler kaydedilmiyor
**Çözüm:**
- Supabase bağlantısını kontrol et
- Console'da hata var mı bak
- Sayfayı yenile ve tekrar dene

---

## 📈 Gelecek Özellikler (İsteğe Bağlı)

- ✨ Toplu izin atama
- ✨ Vardiya değişim talepleri
- ✨ Personel uygunluk takvimi
- ✨ Otomatik mesai hesabı
- ✨ Excel'e dışa aktar
- ✨ Bildirimler (vardiya hatırlatma)

---

## 🎓 Örnekler

### Örnek Senaryo 1: Yeni Ayın Planlanması

```
Tarih: 1 Aralık 2024
Personel: Ahmet, Mehmet, Ayşe (3 kişi)
Vardiya: 5 tip (09-17, 12-20, 18-02, 17-01, 01-09)

Adımlar:
1. Aralık ayını seç
2. "Otomatik Oluştur" tıkla
3. Sistem 31 günlük plan oluşturur
4. Her gün 5 vardiya × 31 gün = 155 atama
5. Personeller döngüsel olarak atanır
6. Gece vardiyaları ve izinler otomatik ayarlanır
```

### Örnek Senaryo 2: Manuel Düzenleme

```
Durum: 15 Aralık'ta Ahmet hastalan di
Çözüm:
1. 15 Aralık'taki Ahmet'in vardiyasına tıkla
2. Personeli "Mehmet" olarak değiştir
3. Kaydet
4. Ahmet'e izin ata (İzinli seç)
```

### Örnek Senaryo 3: Gece Vardiyası İzin Kontrolü

```
Durum: Mehmet 10 Aralık Pazartesi gece vardiyası yaptı
Beklenen:
- 17 Aralık Pazartesi: İzinli
- 18 Aralık Salı: İzinli

Kontrol:
1. 17-18 Aralık'a bak
2. Mehmet izinli mi?
3. Değilse manuel izin ver
```

---

**Yardıma mı ihtiyacınız var?** Hesaplama Test sayfası gibi bir debug sayfası eklenebilir! 🐛
