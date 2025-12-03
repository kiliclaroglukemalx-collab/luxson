/*
  # Add payment system name and rejection tracking columns

  1. Changes
    - Add `payment_system_name` column to `withdrawals` table
      - Type: text
      - Nullable: true
      - Description: Name of the payment system used for the withdrawal
      
    - Add `rejected_by` column to `withdrawals` table
      - Type: text
      - Nullable: true
      - Description: Staff member who rejected the withdrawal request
      
  2. Purpose
    - Track which payment system processed each withdrawal
    - Track which staff member rejected withdrawals
    - Enable payment system performance analysis by actual system name instead of location
    - Distinguish between staff who process vs staff who reject
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'withdrawals' AND column_name = 'payment_system_name'
  ) THEN
    ALTER TABLE withdrawals ADD COLUMN payment_system_name text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'withdrawals' AND column_name = 'rejected_by'
  ) THEN
    ALTER TABLE withdrawals ADD COLUMN rejected_by text;
  END IF;
END $$;