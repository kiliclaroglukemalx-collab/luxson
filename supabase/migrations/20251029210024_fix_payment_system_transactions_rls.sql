/*
  # Fix Payment System Transactions RLS Policies
  
  1. Changes
    - Drop existing restrictive policies
    - Add public access policies for anonymous users
    - Allow anyone to insert, select, update, and delete transactions
  
  2. Security Note
    - This makes the table publicly accessible
    - Appropriate for internal tools without authentication
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can insert transactions" ON payment_system_transactions;
DROP POLICY IF EXISTS "Authenticated users can view transactions" ON payment_system_transactions;
DROP POLICY IF EXISTS "Authenticated users can update transactions" ON payment_system_transactions;
DROP POLICY IF EXISTS "Authenticated users can delete transactions" ON payment_system_transactions;

-- Create public access policies
CREATE POLICY "Anyone can insert transactions"
  ON payment_system_transactions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can view transactions"
  ON payment_system_transactions
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can update transactions"
  ON payment_system_transactions
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete transactions"
  ON payment_system_transactions
  FOR DELETE
  TO anon, authenticated
  USING (true);