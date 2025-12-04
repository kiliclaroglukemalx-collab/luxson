-- AI Bonus Rule Prompts Table
-- Her bonus için doğal dil prompt'u saklar

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

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow all to read ai prompts" ON ai_bonus_rule_prompts;
DROP POLICY IF EXISTS "Allow all to insert ai prompts" ON ai_bonus_rule_prompts;
DROP POLICY IF EXISTS "Allow all to update ai prompts" ON ai_bonus_rule_prompts;
DROP POLICY IF EXISTS "Allow all to delete ai prompts" ON ai_bonus_rule_prompts;
DROP POLICY IF EXISTS "Authenticated users can read ai prompts" ON ai_bonus_rule_prompts;
DROP POLICY IF EXISTS "Authenticated users can insert ai prompts" ON ai_bonus_rule_prompts;
DROP POLICY IF EXISTS "Authenticated users can update ai prompts" ON ai_bonus_rule_prompts;
DROP POLICY IF EXISTS "Authenticated users can delete ai prompts" ON ai_bonus_rule_prompts;

-- Create policies (public erişim için - hem authenticated hem de anon)
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

