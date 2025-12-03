/*
  # Create Special Offers System

  1. New Tables
    - `special_offers`
      - `id` (uuid, primary key)
      - `employee_id` (uuid, foreign key)
      - `offer_date` (date)
      - `image_url` (text) - URL or base64 of the offer image
      - `image_name` (text) - Original filename
      - `notes` (text) - Optional notes
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on table
    - Allow public access for internal tool use

  3. Notes
    - Each employee can upload multiple offers per day
    - Images will be stored as base64 data URLs for simplicity
*/

CREATE TABLE IF NOT EXISTS special_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  offer_date date NOT NULL DEFAULT CURRENT_DATE,
  image_url text NOT NULL,
  image_name text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_special_offers_date ON special_offers(offer_date);
CREATE INDEX IF NOT EXISTS idx_special_offers_employee ON special_offers(employee_id);

-- Enable RLS
ALTER TABLE special_offers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view special offers"
  ON special_offers FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create special offers"
  ON special_offers FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update special offers"
  ON special_offers FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete special offers"
  ON special_offers FOR DELETE
  USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_special_offers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_special_offers_timestamp
  BEFORE UPDATE ON special_offers
  FOR EACH ROW
  EXECUTE FUNCTION update_special_offers_updated_at();