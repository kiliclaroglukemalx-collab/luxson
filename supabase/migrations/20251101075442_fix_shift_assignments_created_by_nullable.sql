/*
  # Fix Shift Assignments - Make created_by Nullable

  1. Changes
    - Make created_by column nullable in shift_assignments table
    - This allows shift assignments to be created without authentication
    - Removes the foreign key constraint that was causing insertion errors

  2. Reason
    - The application needs to work without authentication
    - The created_by field is optional and should not block shift creation
*/

-- Drop the foreign key constraint if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'shift_assignments_created_by_fkey' 
    AND table_name = 'shift_assignments'
  ) THEN
    ALTER TABLE shift_assignments DROP CONSTRAINT shift_assignments_created_by_fkey;
  END IF;
END $$;

-- Make created_by nullable if not already
ALTER TABLE shift_assignments ALTER COLUMN created_by DROP NOT NULL;