-- Create excel_export_settings table
CREATE TABLE IF NOT EXISTS excel_export_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type text NOT NULL UNIQUE,
  settings jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE excel_export_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read excel export settings"
  ON excel_export_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert excel export settings"
  ON excel_export_settings FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update excel export settings"
  ON excel_export_settings FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete excel export settings"
  ON excel_export_settings FOR DELETE
  TO authenticated
  USING (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_excel_export_settings_report_type ON excel_export_settings(report_type);

