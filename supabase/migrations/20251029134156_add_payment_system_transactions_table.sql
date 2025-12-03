/*
  # Payment System Performance Tracking

  1. New Tables
    - `payment_system_transactions`
      - `id` (uuid, primary key)
      - `payment_system_name` (text) - Name of the payment system
      - `processing_started_at` (timestamptz) - When transaction processing started
      - `completed_at` (timestamptz) - When transaction was completed
      - `processing_time_minutes` (numeric) - Calculated processing time
      - `created_at` (timestamptz) - Record creation timestamp

  2. Security
    - Enable RLS on `payment_system_transactions` table
    - Add policy for authenticated users to read data
    - Add policy for authenticated users to insert data
*/

CREATE TABLE IF NOT EXISTS payment_system_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_system_name text NOT NULL,
  processing_started_at timestamptz NOT NULL,
  completed_at timestamptz NOT NULL,
  processing_time_minutes numeric GENERATED ALWAYS AS (
    EXTRACT(EPOCH FROM (completed_at - processing_started_at)) / 60
  ) STORED,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE payment_system_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read payment system transactions"
  ON payment_system_transactions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert payment system transactions"
  ON payment_system_transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete payment system transactions"
  ON payment_system_transactions
  FOR DELETE
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_payment_system_name ON payment_system_transactions(payment_system_name);
CREATE INDEX IF NOT EXISTS idx_processing_started_at ON payment_system_transactions(processing_started_at);
