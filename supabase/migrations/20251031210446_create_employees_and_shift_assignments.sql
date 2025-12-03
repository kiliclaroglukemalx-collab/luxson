/*
  # Create Employees and Shift Assignments System

  1. New Tables
    - `employees`
      - `id` (uuid, primary key) - Unique identifier for each employee
      - `name` (text) - Employee name
      - `active` (boolean) - Whether employee is currently active
      - `created_at` (timestamptz) - When the employee was added
    
    - `shift_assignments`
      - `id` (uuid, primary key) - Unique identifier for each assignment
      - `employee_id` (uuid, foreign key) - Reference to employee
      - `shift_date` (date) - The date of the shift
      - `shift_type` (text) - Type of shift (09-17, 12-20, 18-02, 17-01, 01-09)
      - `created_at` (timestamptz) - When the assignment was created
      - `created_by` (uuid) - User who created the assignment
  
  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage shifts
    - Add unique constraint to prevent double-booking

  3. Initial Data
    - Seed employees: dağhan, sercan, asil, alparslan, kerem, ali
*/

-- Create employees table
CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create shift_assignments table
CREATE TABLE IF NOT EXISTS shift_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  shift_date date NOT NULL,
  shift_type text NOT NULL,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  CONSTRAINT valid_shift_type CHECK (shift_type IN ('09-17', '12-20', '18-02', '17-01', '01-09')),
  CONSTRAINT unique_employee_shift UNIQUE (employee_id, shift_date)
);

-- Enable RLS
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_assignments ENABLE ROW LEVEL SECURITY;

-- Policies for employees table
CREATE POLICY "Authenticated users can view employees"
  ON employees FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert employees"
  ON employees FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update employees"
  ON employees FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete employees"
  ON employees FOR DELETE
  TO authenticated
  USING (true);

-- Policies for shift_assignments table
CREATE POLICY "Authenticated users can view shift assignments"
  ON shift_assignments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create shift assignments"
  ON shift_assignments FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update shift assignments"
  ON shift_assignments FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete shift assignments"
  ON shift_assignments FOR DELETE
  TO authenticated
  USING (true);

-- Seed employees data
INSERT INTO employees (name) VALUES
  ('Dağhan'),
  ('Sercan'),
  ('Asil'),
  ('Alparslan'),
  ('Kerem'),
  ('Ali')
ON CONFLICT DO NOTHING;