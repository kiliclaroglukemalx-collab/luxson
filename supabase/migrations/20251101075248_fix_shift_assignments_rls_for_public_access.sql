/*
  # Fix Shift Assignments RLS Policies for Public Access

  1. Changes
    - Drop existing restrictive policies on shift_assignments table
    - Add new policies that allow all users to read shift assignments
    - This ensures the calendar can display all shifts properly

  2. Security
    - Shift assignments are readable by everyone
    - Write operations still require authentication
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can view shift assignments" ON shift_assignments;
DROP POLICY IF EXISTS "Authenticated users can create shift assignments" ON shift_assignments;
DROP POLICY IF EXISTS "Authenticated users can update shift assignments" ON shift_assignments;
DROP POLICY IF EXISTS "Authenticated users can delete shift assignments" ON shift_assignments;

-- Create new policies with proper access
CREATE POLICY "Anyone can view shift assignments"
  ON shift_assignments FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create shift assignments"
  ON shift_assignments FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update shift assignments"
  ON shift_assignments FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete shift assignments"
  ON shift_assignments FOR DELETE
  TO authenticated
  USING (true);