/*
  # Create Shifts Table

  1. New Tables
    - `shifts`
      - `id` (uuid, primary key)
      - `staff_name` (text) - Staff member name
      - `shift_date` (date) - The date of the shift
      - `shift_type` (text) - Type of shift: '09:00-17:00', '12:00-20:00', '18:00-02:00', '17:00-01:00', '01:00-09:00'
      - `created_at` (timestamptz) - When the shift was created
      - `created_by` (uuid) - User who created the shift
      - `updated_at` (timestamptz) - Last update time

  2. Security
    - Enable RLS on `shifts` table
    - Add policies for authenticated users to manage shifts

  3. Indexes
    - Index on shift_date for efficient date queries
    - Index on staff_name for filtering by staff
*/

CREATE TABLE IF NOT EXISTS shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_name text NOT NULL,
  shift_date date NOT NULL,
  shift_type text NOT NULL CHECK (shift_type IN ('09:00-17:00', '12:00-20:00', '18:00-02:00', '17:00-01:00', '01:00-09:00')),
  created_at timestamptz DEFAULT now(),
  created_by uuid,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(staff_name, shift_date, shift_type)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_shifts_date ON shifts(shift_date);
CREATE INDEX IF NOT EXISTS idx_shifts_staff ON shifts(staff_name);

-- Enable RLS
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated users
CREATE POLICY "Authenticated users can view shifts"
  ON shifts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert shifts"
  ON shifts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update shifts"
  ON shifts FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete shifts"
  ON shifts FOR DELETE
  TO authenticated
  USING (true);