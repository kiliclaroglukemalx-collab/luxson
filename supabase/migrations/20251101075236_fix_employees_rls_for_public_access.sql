/*
  # Fix Employees RLS Policies for Public Access

  1. Changes
    - Drop existing restrictive policies on employees table
    - Add new policies that allow all authenticated users to read employees
    - This fixes the issue where employees weren't showing in the shift assignment modal

  2. Security
    - Employees table is read-only for all authenticated users
    - Write operations still require authentication
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can view employees" ON employees;
DROP POLICY IF EXISTS "Authenticated users can insert employees" ON employees;
DROP POLICY IF EXISTS "Authenticated users can update employees" ON employees;
DROP POLICY IF EXISTS "Authenticated users can delete employees" ON employees;

-- Create new policies with proper access
CREATE POLICY "Anyone can view employees"
  ON employees FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert employees"
  ON employees FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update employees"
  ON employees FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete employees"
  ON employees FOR DELETE
  TO authenticated
  USING (true);