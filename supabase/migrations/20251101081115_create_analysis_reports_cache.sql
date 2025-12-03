/*
  # Create Analysis Reports Cache Table

  1. New Tables
    - `analysis_reports`
      - `id` (uuid, primary key)
      - `report_type` (text) - Type of report: 'bonus_analysis' or 'payment_system_analysis'
      - `report_data` (jsonb) - Cached report data
      - `last_data_upload` (timestamptz) - When the data was last uploaded
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `analysis_reports` table
    - Allow anyone to read cached reports
    - Allow anyone to write/update cached reports (for internal tool use)
*/

CREATE TABLE IF NOT EXISTS analysis_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type text NOT NULL,
  report_data jsonb NOT NULL,
  last_data_upload timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create unique index on report_type to ensure one cache per report type
CREATE UNIQUE INDEX IF NOT EXISTS idx_analysis_reports_report_type ON analysis_reports(report_type);

ALTER TABLE analysis_reports ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view cached reports
CREATE POLICY "Anyone can view analysis reports"
  ON analysis_reports FOR SELECT
  USING (true);

-- Allow anyone to insert cached reports
CREATE POLICY "Anyone can create analysis reports"
  ON analysis_reports FOR INSERT
  WITH CHECK (true);

-- Allow anyone to update cached reports
CREATE POLICY "Anyone can update analysis reports"
  ON analysis_reports FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Allow anyone to delete cached reports
CREATE POLICY "Anyone can delete analysis reports"
  ON analysis_reports FOR DELETE
  USING (true);