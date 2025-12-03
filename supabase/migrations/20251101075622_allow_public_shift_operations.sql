/*
  # Allow Public Access to Shift Operations

  1. Changes
    - Drop existing authenticated-only policies
    - Create new policies that allow anyone to perform all operations
    - This enables shift management without authentication

  2. Security Note
    - This opens up the shift_assignments table to public access
    - Suitable for internal tools where authentication is not required
*/

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Authenticated users can create shift assignments" ON shift_assignments;
DROP POLICY IF EXISTS "Authenticated users can update shift assignments" ON shift_assignments;
DROP POLICY IF EXISTS "Authenticated users can delete shift assignments" ON shift_assignments;

-- Create new open policies
CREATE POLICY "Anyone can create shift assignments"
  ON shift_assignments FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update shift assignments"
  ON shift_assignments FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete shift assignments"
  ON shift_assignments FOR DELETE
  USING (true);