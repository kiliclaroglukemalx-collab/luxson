/*
  # Add completed_at column to withdrawals table

  1. Changes
    - Add `completed_at` column to `withdrawals` table
      - Type: timestamptz (timestamp with timezone)
      - Nullable: true (null means the withdrawal was rejected/not completed)
      - Description: Timestamp when the withdrawal was marked as completed by staff
      
  2. Purpose
    - Track when staff members completed the withdrawal process
    - Calculate payment system performance by comparing completed_at vs payment_date
    - The difference between completed_at and payment_date shows payment system processing time
    - If payment_date is null, the withdrawal was rejected
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'withdrawals' AND column_name = 'completed_at'
  ) THEN
    ALTER TABLE withdrawals ADD COLUMN completed_at timestamptz;
  END IF;
END $$;