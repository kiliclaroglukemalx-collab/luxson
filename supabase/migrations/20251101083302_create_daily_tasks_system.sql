/*
  # Create Daily Tasks System

  1. New Tables
    - `task_definitions`
      - `id` (uuid, primary key)
      - `name` (text) - Task name (e.g., "İç Bakiye İletme")
      - `frequency` (text) - "hourly" or "daily"
      - `description` (text)
      - `active` (boolean)
      - `created_at` (timestamptz)

    - `task_assignments`
      - `id` (uuid, primary key)
      - `task_definition_id` (uuid, foreign key)
      - `employee_id` (uuid, foreign key)
      - `assigned_date` (date)
      - `assigned_hour` (integer) - For hourly tasks (0-23), null for daily tasks
      - `status` (text) - "pending", "in_progress", "completed"
      - `completed_at` (timestamptz)
      - `notes` (text)
      - `created_at` (timestamptz)
      - `created_by` (uuid)

  2. Security
    - Enable RLS on both tables
    - Allow public access for internal tool use
*/

-- Task definitions table
CREATE TABLE IF NOT EXISTS task_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  frequency text NOT NULL CHECK (frequency IN ('hourly', 'daily')),
  description text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Task assignments table
CREATE TABLE IF NOT EXISTS task_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_definition_id uuid NOT NULL REFERENCES task_definitions(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  assigned_date date NOT NULL,
  assigned_hour integer CHECK (assigned_hour >= 0 AND assigned_hour <= 23),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  completed_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  created_by uuid
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_task_assignments_date ON task_assignments(assigned_date);
CREATE INDEX IF NOT EXISTS idx_task_assignments_employee ON task_assignments(employee_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_status ON task_assignments(status);

-- Enable RLS
ALTER TABLE task_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for task_definitions
CREATE POLICY "Anyone can view task definitions"
  ON task_definitions FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create task definitions"
  ON task_definitions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update task definitions"
  ON task_definitions FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete task definitions"
  ON task_definitions FOR DELETE
  USING (true);

-- RLS Policies for task_assignments
CREATE POLICY "Anyone can view task assignments"
  ON task_assignments FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create task assignments"
  ON task_assignments FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update task assignments"
  ON task_assignments FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete task assignments"
  ON task_assignments FOR DELETE
  USING (true);

-- Insert default task definitions
INSERT INTO task_definitions (name, frequency, description) VALUES
  ('İç Bakiye İletme', 'hourly', 'Müşterilerin iç bakiyelerini kontrol et ve gerekli işlemleri yap'),
  ('Yüksek Bakiyeli Oyuncular Kontrolü', 'hourly', 'Yüksek bakiyeli oyuncuların hesaplarını kontrol et'),
  ('Günlük IP Kontrolü', 'daily', 'Şüpheli IP adreslerini ve çoklu hesap kullanımını kontrol et')
ON CONFLICT DO NOTHING;