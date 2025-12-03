/*
  # Bonus Tracking System - Database Schema

  ## Overview
  This migration creates a complete system for tracking deposits, bonuses, withdrawals,
  and analyzing overpayments by staff members.

  ## Tables Created

  1. **bonus_rules**
     - `id` (uuid, primary key)
     - `bonus_name` (text) - Name of the bonus type
     - `calculation_type` (text) - 'fixed', 'multiplier', 'unlimited'
     - `multiplier` (numeric) - Multiplier for calculation (e.g., 50 for 50x)
     - `fixed_amount` (numeric) - Fixed amount to add (e.g., 500)
     - `max_withdrawal_formula` (text) - Human-readable formula description
     - `created_at` (timestamp)

  2. **deposits**
     - `id` (uuid, primary key)
     - `customer_id` (text) - Customer identifier
     - `amount` (numeric) - Deposit amount
     - `deposit_date` (timestamp) - When deposit was made
     - `created_at` (timestamp)

  3. **bonuses**
     - `id` (uuid, primary key)
     - `customer_id` (text) - Customer identifier
     - `bonus_name` (text) - Name of bonus received
     - `amount` (numeric) - Bonus amount
     - `acceptance_date` (timestamp) - When bonus was accepted
     - `deposit_id` (uuid) - Linked deposit (can be null)
     - `created_at` (timestamp)

  4. **withdrawals**
     - `id` (uuid, primary key)
     - `customer_id` (text) - Customer identifier
     - `amount` (numeric) - Withdrawal amount
     - `request_date` (timestamp) - When withdrawal was requested
     - `payment_date` (timestamp) - When payment was made
     - `staff_name` (text) - Staff member who processed
     - `deposit_id` (uuid) - Related deposit
     - `bonus_id` (uuid) - Related bonus
     - `max_allowed_withdrawal` (numeric) - Calculated maximum allowed
     - `is_overpayment` (boolean) - Whether staff overpaid
     - `overpayment_amount` (numeric) - How much was overpaid
     - `processing_time_minutes` (numeric) - Time taken to process
     - `created_at` (timestamp)

  ## Security
  - RLS enabled on all tables
  - Policies allow authenticated users full access for internal tool
*/

-- Create bonus_rules table
CREATE TABLE IF NOT EXISTS bonus_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bonus_name text UNIQUE NOT NULL,
  calculation_type text NOT NULL CHECK (calculation_type IN ('fixed', 'multiplier', 'unlimited')),
  multiplier numeric DEFAULT 0,
  fixed_amount numeric DEFAULT 0,
  max_withdrawal_formula text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE bonus_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read bonus rules"
  ON bonus_rules FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert bonus rules"
  ON bonus_rules FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update bonus rules"
  ON bonus_rules FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create deposits table
CREATE TABLE IF NOT EXISTS deposits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id text NOT NULL,
  amount numeric NOT NULL,
  deposit_date timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE deposits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read deposits"
  ON deposits FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert deposits"
  ON deposits FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update deposits"
  ON deposits FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete deposits"
  ON deposits FOR DELETE
  TO authenticated
  USING (true);

-- Create bonuses table
CREATE TABLE IF NOT EXISTS bonuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id text NOT NULL,
  bonus_name text NOT NULL,
  amount numeric NOT NULL,
  acceptance_date timestamptz NOT NULL,
  deposit_id uuid REFERENCES deposits(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE bonuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read bonuses"
  ON bonuses FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert bonuses"
  ON bonuses FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update bonuses"
  ON bonuses FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete bonuses"
  ON bonuses FOR DELETE
  TO authenticated
  USING (true);

-- Create withdrawals table
CREATE TABLE IF NOT EXISTS withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id text NOT NULL,
  amount numeric NOT NULL,
  request_date timestamptz NOT NULL,
  payment_date timestamptz NOT NULL,
  staff_name text NOT NULL,
  deposit_id uuid REFERENCES deposits(id),
  bonus_id uuid REFERENCES bonuses(id),
  max_allowed_withdrawal numeric,
  is_overpayment boolean DEFAULT false,
  overpayment_amount numeric DEFAULT 0,
  processing_time_minutes numeric,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read withdrawals"
  ON withdrawals FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert withdrawals"
  ON withdrawals FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update withdrawals"
  ON withdrawals FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete withdrawals"
  ON withdrawals FOR DELETE
  TO authenticated
  USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_deposits_customer_date ON deposits(customer_id, deposit_date);
CREATE INDEX IF NOT EXISTS idx_bonuses_customer_date ON bonuses(customer_id, acceptance_date);
CREATE INDEX IF NOT EXISTS idx_withdrawals_customer_date ON withdrawals(customer_id, request_date);
CREATE INDEX IF NOT EXISTS idx_bonuses_deposit_id ON bonuses(deposit_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_deposit_id ON withdrawals(deposit_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_bonus_id ON withdrawals(bonus_id);

-- Insert bonus rules
INSERT INTO bonus_rules (bonus_name, calculation_type, multiplier, fixed_amount, max_withdrawal_formula) VALUES
  ('Tg ve Mobil app 500 DENEME Bonusu', 'fixed', 0, 500, 'Yatırım + 500₺ (max 1000₺)'),
  ('İlk Yatırım Sizden X3 Bizden Casino Yatırım Bonusu', 'multiplier', 50, 0, 'Yatırım × 50'),
  ('Yatırıma özel FreeSpin', 'unlimited', 0, 0, 'Sınırsız'),
  ('İLK 3 YATIRIMINA TAM DESTEK', 'unlimited', 0, 0, 'Sınırsız'),
  ('Sweet Bonanza ve Gates of Olympus da FreeSpin Şöleni', 'unlimited', 0, 0, 'Sınırsız'),
  ('25 Milyon TL Ödüllü TOTOWIN', 'unlimited', 0, 0, 'Sınırsız'),
  ('Kripto Yatırımlara Özel FreeSpin Hediye', 'unlimited', 0, 0, 'Sınırsız'),
  ('%25 Spor Kayıp Bonusu', 'unlimited', 0, 0, 'Sınırsız'),
  ('%25 Casino Kayıp Bonusu', 'unlimited', 0, 0, 'Sınırsız'),
  ('Hafta Sonuna Özel %50 Slot Bonusu', 'multiplier', 20, 0, 'Bonus × 20'),
  ('%5 Telafi Bonusu', 'multiplier', 10, 0, 'Bonus × 10')
ON CONFLICT (bonus_name) DO NOTHING;