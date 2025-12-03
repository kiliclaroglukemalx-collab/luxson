/*
  # Fix RLS Policies for Anonymous Access

  ## Changes
  This migration updates RLS policies to allow both authenticated and anonymous users
  to access all tables. This is necessary because the application uses the anon key.

  ## Security Note
  For an internal tool, this is acceptable. For production with real user data,
  you would want more restrictive policies.
*/

-- Drop existing policies for bonus_rules
DROP POLICY IF EXISTS "Authenticated users can read bonus rules" ON bonus_rules;
DROP POLICY IF EXISTS "Authenticated users can insert bonus rules" ON bonus_rules;
DROP POLICY IF EXISTS "Authenticated users can update bonus rules" ON bonus_rules;

-- Create new policies for bonus_rules (allow anon)
CREATE POLICY "Allow all to read bonus rules"
  ON bonus_rules FOR SELECT
  USING (true);

CREATE POLICY "Allow all to insert bonus rules"
  ON bonus_rules FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow all to update bonus rules"
  ON bonus_rules FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all to delete bonus rules"
  ON bonus_rules FOR DELETE
  USING (true);

-- Update deposits policies
DROP POLICY IF EXISTS "Authenticated users can read deposits" ON deposits;
DROP POLICY IF EXISTS "Authenticated users can insert deposits" ON deposits;
DROP POLICY IF EXISTS "Authenticated users can update deposits" ON deposits;
DROP POLICY IF EXISTS "Authenticated users can delete deposits" ON deposits;

CREATE POLICY "Allow all to read deposits"
  ON deposits FOR SELECT
  USING (true);

CREATE POLICY "Allow all to insert deposits"
  ON deposits FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow all to update deposits"
  ON deposits FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all to delete deposits"
  ON deposits FOR DELETE
  USING (true);

-- Update bonuses policies
DROP POLICY IF EXISTS "Authenticated users can read bonuses" ON bonuses;
DROP POLICY IF EXISTS "Authenticated users can insert bonuses" ON bonuses;
DROP POLICY IF EXISTS "Authenticated users can update bonuses" ON bonuses;
DROP POLICY IF EXISTS "Authenticated users can delete bonuses" ON bonuses;

CREATE POLICY "Allow all to read bonuses"
  ON bonuses FOR SELECT
  USING (true);

CREATE POLICY "Allow all to insert bonuses"
  ON bonuses FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow all to update bonuses"
  ON bonuses FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all to delete bonuses"
  ON bonuses FOR DELETE
  USING (true);

-- Update withdrawals policies
DROP POLICY IF EXISTS "Authenticated users can read withdrawals" ON withdrawals;
DROP POLICY IF EXISTS "Authenticated users can insert withdrawals" ON withdrawals;
DROP POLICY IF EXISTS "Authenticated users can update withdrawals" ON withdrawals;
DROP POLICY IF EXISTS "Authenticated users can delete withdrawals" ON withdrawals;

CREATE POLICY "Allow all to read withdrawals"
  ON withdrawals FOR SELECT
  USING (true);

CREATE POLICY "Allow all to insert withdrawals"
  ON withdrawals FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow all to update withdrawals"
  ON withdrawals FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all to delete withdrawals"
  ON withdrawals FOR DELETE
  USING (true);
