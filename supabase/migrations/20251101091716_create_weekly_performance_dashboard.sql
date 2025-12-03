/*
  # Create Weekly Performance Dashboard System

  1. New Tables
    - `weekly_employee_stats`
      - `id` (uuid, primary key)
      - `employee_id` (uuid, foreign key)
      - `week_start_date` (date) - Monday of the week
      - `total_withdrawals` (integer)
      - `total_amount` (numeric)
      - `avg_processing_time` (numeric) - in minutes
      - `rejection_count` (integer)
      - `rejection_rate` (numeric)
      - `performance_score` (numeric) - 1-10
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `weekly_payment_system_stats`
      - `id` (uuid, primary key)
      - `payment_system` (text)
      - `week_start_date` (date) - Monday of the week
      - `total_transactions` (integer)
      - `total_amount` (numeric)
      - `avg_amount` (numeric)
      - `success_count` (integer)
      - `success_rate` (numeric)
      - `avg_processing_time` (numeric) - in minutes
      - `performance_score` (numeric) - 1-10
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Indexes
    - Create composite indexes for efficient querying

  3. Security
    - Enable RLS with public access policies

  4. Notes
    - Stats are calculated weekly (Monday to Sunday)
    - Performance scores are auto-calculated based on multiple metrics
    - Cumulative data builds up as days pass in the week
*/

-- Weekly Employee Stats Table
CREATE TABLE IF NOT EXISTS weekly_employee_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  week_start_date date NOT NULL,
  total_withdrawals integer DEFAULT 0,
  total_amount numeric(15,2) DEFAULT 0,
  avg_processing_time numeric(10,2) DEFAULT 0,
  rejection_count integer DEFAULT 0,
  rejection_rate numeric(5,2) DEFAULT 0,
  performance_score numeric(3,1) DEFAULT 5.0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(employee_id, week_start_date)
);

-- Weekly Payment System Stats Table
CREATE TABLE IF NOT EXISTS weekly_payment_system_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_system text NOT NULL,
  week_start_date date NOT NULL,
  total_transactions integer DEFAULT 0,
  total_amount numeric(15,2) DEFAULT 0,
  avg_amount numeric(10,2) DEFAULT 0,
  success_count integer DEFAULT 0,
  success_rate numeric(5,2) DEFAULT 0,
  avg_processing_time numeric(10,2) DEFAULT 0,
  performance_score numeric(3,1) DEFAULT 5.0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(payment_system, week_start_date)
);

-- Create Indexes
CREATE INDEX IF NOT EXISTS idx_weekly_employee_stats_week ON weekly_employee_stats(week_start_date);
CREATE INDEX IF NOT EXISTS idx_weekly_employee_stats_employee ON weekly_employee_stats(employee_id);
CREATE INDEX IF NOT EXISTS idx_weekly_employee_stats_score ON weekly_employee_stats(performance_score);

CREATE INDEX IF NOT EXISTS idx_weekly_payment_system_stats_week ON weekly_payment_system_stats(week_start_date);
CREATE INDEX IF NOT EXISTS idx_weekly_payment_system_stats_system ON weekly_payment_system_stats(payment_system);
CREATE INDEX IF NOT EXISTS idx_weekly_payment_system_stats_score ON weekly_payment_system_stats(performance_score);

-- Enable RLS
ALTER TABLE weekly_employee_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_payment_system_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Employee Stats
CREATE POLICY "Anyone can view employee stats"
  ON weekly_employee_stats FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert employee stats"
  ON weekly_employee_stats FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update employee stats"
  ON weekly_employee_stats FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete employee stats"
  ON weekly_employee_stats FOR DELETE
  USING (true);

-- RLS Policies for Payment System Stats
CREATE POLICY "Anyone can view payment system stats"
  ON weekly_payment_system_stats FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert payment system stats"
  ON weekly_payment_system_stats FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update payment system stats"
  ON weekly_payment_system_stats FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete payment system stats"
  ON weekly_payment_system_stats FOR DELETE
  USING (true);

-- Update timestamp triggers
CREATE OR REPLACE FUNCTION update_weekly_stats_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_weekly_employee_stats_timestamp
  BEFORE UPDATE ON weekly_employee_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_weekly_stats_updated_at();

CREATE TRIGGER update_weekly_payment_system_stats_timestamp
  BEFORE UPDATE ON weekly_payment_system_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_weekly_stats_updated_at();