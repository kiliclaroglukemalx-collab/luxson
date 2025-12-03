/*
  # Fix Security Issues - Comprehensive Update

  This migration addresses all identified security issues:

  ## 1. Foreign Key Indexes
    - Add covering index for `task_assignments.task_definition_id`

  ## 2. Unused Indexes
    - Remove all unused indexes that provide no query performance benefit:
      - idx_withdrawals_customer_date
      - idx_special_offers_employee
      - idx_shifts_date
      - idx_shifts_staff
      - idx_weekly_employee_stats_employee
      - idx_weekly_employee_stats_score
      - idx_weekly_payment_system_stats_system
      - idx_weekly_payment_system_stats_score
      - idx_payment_system_name
      - idx_task_assignments_employee
      - idx_task_assignments_status

  ## 3. Multiple Permissive Policies
    - Remove duplicate/conflicting RLS policies on payment_system_transactions
    - Keep only the restrictive authenticated policies

  ## 4. Function Search Path Security
    - Fix search_path for trigger functions to prevent SQL injection

  ## Security Impact
    - Improved query performance with proper foreign key indexing
    - Reduced maintenance overhead by removing unused indexes
    - Fixed policy conflicts for proper access control
    - Secured functions against search_path exploitation
*/

-- 1. Add missing foreign key index
CREATE INDEX IF NOT EXISTS idx_task_assignments_task_definition_id 
ON task_assignments(task_definition_id);

-- 2. Drop unused indexes
DROP INDEX IF EXISTS idx_withdrawals_customer_date;
DROP INDEX IF EXISTS idx_special_offers_employee;
DROP INDEX IF EXISTS idx_shifts_date;
DROP INDEX IF EXISTS idx_shifts_staff;
DROP INDEX IF EXISTS idx_weekly_employee_stats_employee;
DROP INDEX IF EXISTS idx_weekly_employee_stats_score;
DROP INDEX IF EXISTS idx_weekly_payment_system_stats_system;
DROP INDEX IF EXISTS idx_weekly_payment_system_stats_score;
DROP INDEX IF EXISTS idx_payment_system_name;
DROP INDEX IF EXISTS idx_task_assignments_employee;
DROP INDEX IF EXISTS idx_task_assignments_status;

-- 3. Fix multiple permissive policies on payment_system_transactions
-- Drop the overly permissive "Anyone can..." policies
DROP POLICY IF EXISTS "Anyone can view transactions" ON payment_system_transactions;
DROP POLICY IF EXISTS "Anyone can insert transactions" ON payment_system_transactions;
DROP POLICY IF EXISTS "Anyone can delete transactions" ON payment_system_transactions;

-- Keep only the authenticated user policies (these should already exist)
-- If they don't exist, create them
DO $$
BEGIN
  -- Check and create SELECT policy if needed
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'payment_system_transactions' 
    AND policyname = 'Allow authenticated users to read payment system transactions'
  ) THEN
    CREATE POLICY "Allow authenticated users to read payment system transactions"
      ON payment_system_transactions
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  -- Check and create INSERT policy if needed
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'payment_system_transactions' 
    AND policyname = 'Allow authenticated users to insert payment system transactions'
  ) THEN
    CREATE POLICY "Allow authenticated users to insert payment system transactions"
      ON payment_system_transactions
      FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;

  -- Check and create DELETE policy if needed
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'payment_system_transactions' 
    AND policyname = 'Allow authenticated users to delete payment system transactions'
  ) THEN
    CREATE POLICY "Allow authenticated users to delete payment system transactions"
      ON payment_system_transactions
      FOR DELETE
      TO authenticated
      USING (true);
  END IF;
END $$;

-- 4. Fix function search_path security issues
-- Recreate functions with secure search_path

-- Fix update_special_offers_updated_at
CREATE OR REPLACE FUNCTION public.update_special_offers_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix update_weekly_stats_updated_at
CREATE OR REPLACE FUNCTION public.update_weekly_stats_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;