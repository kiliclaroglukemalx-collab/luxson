/*
  # Add 'konum' (status) column to withdrawals table

  1. Changes
    - Add `konum` column to `withdrawals` table to track withdrawal status (e.g., "Onaylandı", "Reddedildi")
    - Column allows NULL for existing records
    - Default value is NULL (will be populated from file uploads)

  2. Notes
    - This allows tracking of rejected withdrawals
    - Rejected withdrawals will be included in staff processing time calculations
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'withdrawals' AND column_name = 'konum'
  ) THEN
    ALTER TABLE withdrawals ADD COLUMN konum text;
  END IF;
END $$;