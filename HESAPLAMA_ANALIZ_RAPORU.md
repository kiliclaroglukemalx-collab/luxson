# 🔍 Hesaplama Koşulları Detaylı Analiz Raporu

## 📋 Genel Bakış

### Ana Hesaplama Modülü
**Dosya:** `src/utils/matchingEngine.ts`

### İki Ana Fonksiyon:
1. **`matchBonusesToDeposits()`** - Bonus-deposit eşleştirmesi
2. **`analyzeWithdrawals()`** - Çekim analizi ve limit hesaplama

---

## 1️⃣ BONUS-DEPOSIT EŞLEŞTİRMESİ (`matchBonusesToDeposits`)

### Mevcut Mantık:

#### A. Özel Bonus Mantıkları (SPECIAL_BONUS_LOGICS)
```typescript
- "Tg ve Mobil app 500 DENEME Bonusu"
  - depositTiming: 'after' (Deposit bonustan SONRA gelir)
  - matchingStrategy: Bonustan sonraki İLK deposit ile eşleştir
```

#### B. Varsayılan Eşleştirme:
1. **Özel mantık varsa:** Özel strateji kullanılır
2. **Deposit timing = 'after':** Bonustan SONRA gelen depositler arasından EN ERKEN olanı seçilir
3. **Varsayılan (timing = 'before'):** Bonustan ÖNCE gelen depositler arasından EN YAKIN (en son) olanı seçilir

### ⚠️ POTANSİYEL SORUNLAR:

1. **Sadece 1 özel bonus mantığı var**
   - Diğer bonuslar için özel mantık yok
   - Tüm bonuslar varsayılan mantığa göre eşleştiriliyor

2. **Deposit timing kontrolü eksik**
   - `depositTiming: 'before'` olan bonuslar için özel mantık yok
   - Sadece `'after'` için özel kontrol var

3. **Aynı müşteri için birden fazla bonus varsa**
   - Her bonus için ayrı ayrı eşleştirme yapılıyor
   - Aynı deposit birden fazla bonus ile eşleşebilir (sorun olabilir!)

---

## 2️⃣ ÇEKİM ANALİZİ (`analyzeWithdrawals`)

### Mevcut Mantık:

#### A. Bonus Bulma:
```typescript
// Çekimden ÖNCE kabul edilen bonuslar bulunur
customerBonuses = bonuses.filter(
  b => b.customer_id === withdrawal.customer_id &&
  new Date(b.acceptance_date) < requestDate
)

// EN SON (en yakın) bonus seçilir
linkedBonus = customerBonuses.reduce((latest, current) => 
  currentDate > latestDate ? current : latest
)
```

#### B. Deposit Bulma:
```typescript
// Bonus'un deposit_id'si varsa, o deposit kullanılır
closestDeposit = linkedBonus.deposit_id 
  ? deposits.find(d => d.id === linkedBonus.deposit_id)
  : null
```

#### C. Bonus Kuralı Bulma:
```typescript
// Esnek eşleştirme:
bonusRule = bonusRules.find(br => 
  br.bonus_name === linkedBonus.bonus_name ||        // Tam eşleşme
  linkedBonus.bonus_name.includes(br.bonus_name) || // İçerir
  br.bonus_name.includes(linkedBonus.bonus_name)     // Ters içerir
)
```

#### D. Max Allowed Hesaplama (ÖNEMLİ!):

**Öncelik Sırası:**
1. **Özel hesaplama mantığı** (`calculationOverride`) - Varsa
2. **`unlimited`** - Sınırsız çekim
3. **Formül bazlı** (`max_withdrawal_formula`) - EN GELİŞMİŞ
4. **Klasik tipler:**
   - `fixed`: Deposit + fixed_amount (veya sadece fixed_amount)
   - `multiplier`: Deposit × multiplier (veya Bonus × multiplier)

### ⚠️ POTANSİYEL SORUNLAR:

#### 1. **Bonus Seçimi Sorunu:**
```typescript
// SORUN: EN SON bonus seçiliyor, ama bu her zaman doğru olmayabilir!
// Örnek: 
// - Bonus 1: 01.01.2024 (1000₺)
// - Bonus 2: 02.01.2024 (500₺)
// - Çekim: 03.01.2024
// → Bonus 2 seçilir, ama belki Bonus 1 daha önemli!
```

#### 2. **Deposit Eksikliği:**
```typescript
// SORUN: Deposit yoksa multiplier hesaplaması bonus üzerinden yapılıyor
// Ama bu her zaman doğru olmayabilir!
if (closestDeposit) {
  maxAllowed = closestDeposit.amount * bonusRule.multiplier;
} else {
  maxAllowed = linkedBonus.amount * bonusRule.multiplier; // ⚠️ Bu mantıklı mı?
}
```

#### 3. **Formül Değerlendirme:**
```typescript
// SORUN: Function() kullanımı güvenlik riski olabilir
const result = Function(`"use strict"; return (${expression})`)();
// Ayrıca, Math.min, Math.max gibi fonksiyonlar kullanılamaz!
```

#### 4. **Overpayment Kontrolü:**
```typescript
// SORUN: Infinity kontrolü var ama...
if (maxAllowed !== Infinity) {
  isOverpayment = withdrawal.amount > maxAllowed;
}
// Eğer maxAllowed = 0 ise, tüm çekimler fazla ödeme olarak işaretlenir!
```

#### 5. **Kural Bulunamama:**
```typescript
// SORUN: Kural bulunamazsa maxAllowed = 0 yapılıyor
// Bu durumda tüm çekimler fazla ödeme olarak görünür!
if (linkedBonus && !bonusRule) {
  maxAllowed = 0;
  isOverpayment = false; // ⚠️ Ama bu false! Mantıklı mı?
  overpaymentAmount = 0;
}
```

---

## 3️⃣ HESAPLAMA TİPLERİ

### A. `unlimited` (Sınırsız)
```typescript
maxAllowed = Infinity;
// Overpayment kontrolü yapılmaz
```

### B. `fixed` (Sabit)
```typescript
if (closestDeposit) {
  maxAllowed = closestDeposit.amount + bonusRule.fixed_amount;
} else {
  maxAllowed = bonusRule.fixed_amount;
}
```

### C. `multiplier` (Çarpan)
```typescript
if (closestDeposit) {
  maxAllowed = closestDeposit.amount * bonusRule.multiplier;
} else {
  maxAllowed = linkedBonus.amount * bonusRule.multiplier;
}
```

### D. `max_withdrawal_formula` (Formül)
```typescript
// Değişkenler:
- deposit: closestDeposit?.amount || 0
- bonus: linkedBonus.amount
- withdrawal: withdrawal.amount
- multiplier: bonusRule.multiplier || 0
- fixed: bonusRule.fixed_amount || 0

// Formül örnekleri:
- "bonus * 20"
- "deposit * 3"
- "deposit + bonus * 10"
```

### ⚠️ FORMÜL SORUNLARI:

1. **Math fonksiyonları çalışmaz:**
   ```typescript
   // ❌ ÇALIŞMAZ:
   "Math.min(deposit * 5, 10000)"
   
   // ✅ ÇALIŞIR:
   "deposit * 5" // Ama limit kontrolü yok!
   ```

2. **Hata durumunda fallback:**
   ```typescript
   // Formül başarısız olursa calculateFallbackMax() çağrılır
   // Ama bu her zaman doğru sonuç vermeyebilir!
   ```

---

## 4️⃣ ÖZEL BONUS MANTIKLARI

### Mevcut Özel Mantık:
```typescript
{
  name: 'Tg ve Mobil app 500 DENEME Bonusu',
  depositTiming: 'after',
  matchingStrategy: (bonus, deposits) => {
    // Bonustan sonraki İLK deposit
    return depositsAfterBonus.reduce((earliest, current) => 
      currentDate < earliestDate ? current : earliest
    );
  }
  // ⚠️ calculationOverride YOK! Yani hesaplama normal mantıkla yapılıyor
}
```

### ⚠️ SORUNLAR:

1. **Sadece eşleştirme stratejisi var, hesaplama override yok**
2. **Diğer bonuslar için özel mantık yok**
3. **"Tg ve Mobil app 500 DENEME Bonusu" için özel hesaplama yok**

---

## 5️⃣ KRİTİK SORUNLAR ÖZET

### 🔴 YÜKSEK ÖNCELİK:

1. **Bonus seçimi mantığı:**
   - EN SON bonus seçiliyor, ama bu her zaman doğru değil
   - Birden fazla bonus varsa hangisi seçilmeli?

2. **Deposit yoksa hesaplama:**
   - Multiplier: `bonus * multiplier` - Bu mantıklı mı?
   - Fixed: Sadece `fixed_amount` - Deposit olmadan sabit miktar mı?

3. **Formül değerlendirme:**
   - Math.min, Math.max çalışmıyor
   - Güvenlik riski (Function() kullanımı)

4. **Kural bulunamama:**
   - `maxAllowed = 0` yapılıyor
   - Tüm çekimler fazla ödeme olarak görünebilir

5. **Overpayment kontrolü:**
   - `maxAllowed = 0` ise tüm çekimler fazla ödeme
   - `maxAllowed = Infinity` ise kontrol yapılmıyor

### 🟡 ORTA ÖNCELİK:

6. **Aynı deposit birden fazla bonus ile eşleşebilir**
7. **Özel bonus mantıkları eksik**
8. **Processing time hesaplama:**
   ```typescript
   // payment_date yoksa hata olabilir!
   const paymentDate = new Date(withdrawal.payment_date);
   ```

### 🟢 DÜŞÜK ÖNCELİK:

9. **Log mesajları Türkçe/İngilizce karışık**
10. **Hata mesajları yeterince açıklayıcı değil**

---

## 6️⃣ ÖNERİLER

### A. Bonus Seçimi İyileştirmesi:
```typescript
// Öneri: En yüksek miktarlı bonus seçilsin
// veya en yakın tarihli bonus seçilsin (mevcut)
// veya kullanıcı tercihine göre
```

### B. Deposit Eksikliği İyileştirmesi:
```typescript
// Öneri: Deposit yoksa hesaplama yapılmasın
// veya uyarı verilsin
// veya farklı bir mantık uygulansın
```

### C. Formül İyileştirmesi:
```typescript
// Öneri: Math fonksiyonları için özel parser
// veya güvenli formül değerlendirme kütüphanesi
// veya formül builder UI
```

### D. Kural Bulunamama İyileştirmesi:
```typescript
// Öneri: Kural bulunamazsa uyarı ver
// veya varsayılan kural kullan
// veya hesaplama yapma (mevcut)
```

---

## 7️⃣ TEST EDİLMESİ GEREKEN SENARYOLAR

1. ✅ Birden fazla bonus varsa hangisi seçiliyor?
2. ✅ Deposit yoksa hesaplama nasıl yapılıyor?
3. ✅ Formül hatalıysa ne oluyor?
4. ✅ Kural bulunamazsa ne oluyor?
5. ✅ `maxAllowed = 0` durumunda ne oluyor?
6. ✅ `payment_date` yoksa ne oluyor?
7. ✅ Aynı deposit birden fazla bonus ile eşleşiyor mu?
8. ✅ Özel bonus mantıkları çalışıyor mu?

---

## 8️⃣ MEVCUT BONUS KURALLARI

Veritabanındaki kurallar:
1. `Tg ve Mobil app 500 DENEME Bonusu` - fixed, 500₺
2. `İlk Yatırım Sizden X3 Bizden Casino Yatırım Bonusu` - multiplier, 50x
3. `Yatırıma özel FreeSpin` - unlimited
4. `İLK 3 YATIRIMINA TAM DESTEK` - unlimited
5. `Sweet Bonanza ve Gates of Olympus da FreeSpin Şöleni` - unlimited
6. `25 Milyon TL Ödüllü TOTOWIN` - unlimited
7. `Kripto Yatırımlara Özel FreeSpin Hediye` - unlimited
8. `%25 Spor Kayıp Bonusu` - unlimited
9. `%25 Casino Kayıp Bonusu` - unlimited
10. `Hafta Sonuna Özel %50 Slot Bonusu` - multiplier, 20x
11. `%5 Telafi Bonusu` - multiplier, 10x

---

## 📝 SONUÇ

Mevcut hesaplama sistemi genel olarak çalışıyor, ancak bazı edge case'lerde sorunlar olabilir. Özellikle:
- Bonus seçimi mantığı
- Deposit eksikliği durumları
- Formül değerlendirme
- Kural bulunamama durumları

Bu alanların iyileştirilmesi gerekiyor.

