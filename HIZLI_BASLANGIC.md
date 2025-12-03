# ⚡ Hızlı Başlangıç - Gelişmiş Hesaplama Motoru

## ✅ Yapılması Gerekenler (Checklist)

### 1️⃣ İlk Kurulum
- [ ] Projeyi açın
- [ ] Yönetim moduna geçin (Kullanıcı Modu butonuna tıklayın)
- [ ] "Bonus Kuralları" sayfasını açın

### 2️⃣ Mevcut Kuralları Kontrol Edin
- [ ] Her bonus için kural tanımlı mı kontrol edin
- [ ] Formül alanları dolu mu bakın
- [ ] Eksik kurallar varsa ekleyin

### 3️⃣ Test Edin
- [ ] "Hesaplama Test" sayfasını açın
- [ ] "Analizi Çalıştır" butonuna tıklayın
- [ ] Sonuçları inceleyin:
  - [ ] Kaç fazla ödeme var?
  - [ ] Kaç kural bulunamadı uyarısı var?
  - [ ] Hesaplama logları anlamlı mı?

### 4️⃣ Hataları Düzeltin
- [ ] "Bonus için kural bulunamadı" uyarıları için kural ekleyin
- [ ] Yanlış hesaplanan bonuslar için formül düzeltin
- [ ] Test merkezi ile tekrar kontrol edin

### 5️⃣ Canlıya Alın
- [ ] Tüm testler başarılı mı?
- [ ] Beklediğiniz sonuçları alıyor musunuz?
- [ ] Evet ise gerçek verileri yükleyin

---

## 🎯 En Sık Kullanılan Formüller

### Basit Çarpma Bonusları
```javascript
// Bonus × 20 (örn: 500₺ bonusta 10.000₺ çekim)
bonus * 20

// Bonus × 10
bonus * 10

// Bonus × 5
bonus * 5
```

### Deposit Bazlı Bonuslar
```javascript
// Deposit × 3 (örn: 1000₺ yatırımda 3000₺ çekim)
deposit * 3

// Deposit × 5
deposit * 5

// Deposit × 2
deposit * 2
```

### Kombine Hesaplamalar
```javascript
// Deposit + Bonus
deposit + bonus

// Deposit + (Bonus × 10)
deposit + bonus * 10

// (Deposit + Bonus) × 2
(deposit + bonus) * 2
```

### Limit ile Hesaplamalar
```javascript
// En fazla 10.000₺
Math.min(deposit * 5, 10000)

// En fazla 5.000₺
Math.min(bonus * 20, 5000)

// Deposit × 3 ama max 15.000₺
Math.min(deposit * 3, 15000)
```

### Karmaşık Hesaplamalar
```javascript
// VIP Bonus: Deposit'in %50'si + Bonus × 15 + 500₺ ekstra
(deposit * 0.5) + (bonus * 15) + 500

// Kademeli: İlk 1000₺ × 5, kalanı × 3
Math.min(deposit, 1000) * 5 + Math.max(deposit - 1000, 0) * 3
```

---

## 🚨 Sık Karşılaşılan Hatalar ve Çözümleri

### ❌ Hata: "Bonus için kural bulunamadı"
**Sebep:** O bonus için kural tanımlanmamış

**Çözüm:**
1. Bonus Kuralları sayfasına git
2. "Yeni Kural Ekle" butonuna tıkla
3. Bonus adını TAM olarak yaz (veya kısa hali yaz, esnek eşleşir)
4. Hesaplama tipini seç
5. Formülü yaz
6. Kaydet ve test et

---

### ❌ Hata: "Formül hatası"
**Sebep:** Formül söz dizimi hatalı

**Çözüm:**
1. Parantez eşleştirmesini kontrol et
2. Değişken isimlerini kontrol et (`deposit`, `bonus`, `multiplier`, `fixed`)
3. Matematiksel operatörleri kontrol et (`+`, `-`, `*`, `/`)
4. Basit bir formülle test et (örn: `bonus * 20`)
5. Çalışırsa yavaş yavaş karmaşıklaştır

---

### ❌ Hata: Hesaplama sonuçları beklediğim gibi değil
**Sebep:** Formül yanlış veya değişkenler yanlış anlaşılmış

**Çözüm:**
1. Hesaplama Test sayfasını aç
2. İlgili çekimi bul
3. "Hesaplama Detayları"nı aç
4. Hangi değişkenlerin ne değer aldığını gör
5. Formülü buna göre düzelt

**Örnek Debugging:**
```
Formül: deposit * 3
Değişkenler: deposit=1000
Hesaplanan Max: 3000₺

Çekilen: 3500₺
⚠️ FAZLA ÖDEME! +500₺

Çözüm: Formülü deposit * 4 yap veya limitin 3000₺ olmasını onayla
```

---

## 💡 Pro İpuçları

### 1. Formül Test Etme
Her yeni formülü mutlaka Test Merkezi'nde deneyin:
```
1. Formülü yaz
2. Kaydet
3. Test Merkezi'ni aç
4. Analizi çalıştır
5. Sonuçları kontrol et
6. Gerekirse düzelt
```

### 2. Bonus İsimleri
Bonus isimlerinde tutarlı olun:
- ✅ İyi: "Hoş Geldin Bonusu"
- ✅ İyi: "Hoşgeldin"
- ❌ Kötü: Bazen "Hoş Geldin", bazen "Hosgeldin"

### 3. Formül Belgeleme
Karmaşık formülleri not alın:
```
VIP Bonus Formülü:
(deposit * 0.5) + (bonus * 15) + 500

Mantık:
- Deposit'in yarısını al
- Bonus'un 15 katını ekle
- 500₺ sabit bonus ekle
```

### 4. Yedekleme
Önemli değişiklikler öncesi:
- Mevcut kuralları kaydedin
- Test sonuçlarını not alın
- Yedek alın

---

## 📊 Performans İpuçları

- Her dosya yükleme sonrası analiz çalıştırın
- Test Merkezi'ni düzenli kullanın
- Fazla ödemeleri hemen kontrol edin
- Logları düzenli inceleyin

---

## 🎓 Öğrenme Yolu

### Başlangıç Seviyesi
1. Basit çarpma formüllerini öğren (`bonus * 20`)
2. Test Merkezi'ni kullanmaya alış
3. Bir iki kural ekle ve test et

### Orta Seviye
1. Deposit bazlı formüller (`deposit * 3`)
2. Kombine hesaplamalar (`deposit + bonus * 10`)
3. Kendi bonuslarını ekle

### İleri Seviye
1. Limit kontrolleri (`Math.min()`)
2. Karmaşık formüller
3. Özel bonus mantıkları (kod gerektirir)

---

## 📞 Yardım Alın

Takıldığınız zaman:
1. Bu dökümanı tekrar okuyun
2. Test Merkezi'ni kullanın
3. Hesaplama loglarını inceleyin
4. Basit bir örnekle test edin
5. Adım adım ilerleyin

**Unutmayın:** Test Merkezi en iyi dostunuz! 🐛✨
