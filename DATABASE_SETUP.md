# Database Setup - AI Bonus Rule Prompts

## Tablo Oluşturma

Supabase SQL Editor'da şu SQL'i çalıştırın:

```sql
-- AI Bonus Rule Prompts Table
CREATE TABLE IF NOT EXISTS ai_bonus_rule_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bonus_name text UNIQUE NOT NULL,
  prompt text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE ai_bonus_rule_prompts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow all to read ai prompts" ON ai_bonus_rule_prompts;
DROP POLICY IF EXISTS "Allow all to insert ai prompts" ON ai_bonus_rule_prompts;
DROP POLICY IF EXISTS "Allow all to update ai prompts" ON ai_bonus_rule_prompts;
DROP POLICY IF EXISTS "Allow all to delete ai prompts" ON ai_bonus_rule_prompts;
DROP POLICY IF EXISTS "Authenticated users can read ai prompts" ON ai_bonus_rule_prompts;
DROP POLICY IF EXISTS "Authenticated users can insert ai prompts" ON ai_bonus_rule_prompts;
DROP POLICY IF EXISTS "Authenticated users can update ai prompts" ON ai_bonus_rule_prompts;
DROP POLICY IF EXISTS "Authenticated users can delete ai prompts" ON ai_bonus_rule_prompts;

-- Create policies (public erişim için)
CREATE POLICY "Allow all to read ai prompts"
  ON ai_bonus_rule_prompts FOR SELECT
  USING (true);

CREATE POLICY "Allow all to insert ai prompts"
  ON ai_bonus_rule_prompts FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow all to update ai prompts"
  ON ai_bonus_rule_prompts FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all to delete ai prompts"
  ON ai_bonus_rule_prompts FOR DELETE
  USING (true);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_ai_prompts_bonus_name ON ai_bonus_rule_prompts(bonus_name);
```

## Fallback Sistemi

Eğer database tablosu yoksa veya erişim sorunu varsa, sistem otomatik olarak **localStorage** kullanır. Bu sayede:

- ✅ Kaydetme işlemi her zaman çalışır
- ✅ Veriler tarayıcıda saklanır
- ✅ Database hazır olduğunda otomatik sync yapılır

## Test

1. Bonus Kuralları sayfasına gidin
2. Bir bonus adı ve prompt girin
3. "Kaydet" butonuna tıklayın
4. Console'u açın (F12) ve log'ları kontrol edin
5. Başarılı mesajı görmelisiniz

## Sorun Giderme

### Hata: "relation does not exist"
- Supabase SQL Editor'da yukarıdaki SQL'i çalıştırın

### Hata: "permission denied"
- RLS policy'lerin doğru oluşturulduğundan emin olun
- Policy'leri tekrar oluşturun

### Hata: "duplicate key"
- Aynı bonus adı zaten var, düzenleme modunda güncelleyin

