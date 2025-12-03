-- Aylık Vardiya Sistemi için Veritabanı Güncellemeleri

-- 1. Employees tablosuna shift_rotation_order ekle (eğer yoksa)
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS shift_rotation_order INTEGER DEFAULT 999;

-- 2. Shift_assignments tablosuna is_off_day ekle (eğer yoksa)
ALTER TABLE shift_assignments 
ADD COLUMN IF NOT EXISTS is_off_day BOOLEAN DEFAULT false;

-- 3. Aktif personellere sıra numarası ata (eğer yoksa)
UPDATE employees 
SET shift_rotation_order = (
  SELECT ROW_NUMBER() OVER (ORDER BY created_at)
  FROM (SELECT id, created_at FROM employees) e
  WHERE e.id = employees.id
)
WHERE shift_rotation_order IS NULL OR shift_rotation_order = 999;

-- 4. Index'ler ekle (performans için)
CREATE INDEX IF NOT EXISTS idx_shift_assignments_date ON shift_assignments(shift_date);
CREATE INDEX IF NOT EXISTS idx_shift_assignments_employee ON shift_assignments(employee_id);
CREATE INDEX IF NOT EXISTS idx_employees_rotation_order ON employees(shift_rotation_order);

-- 5. Açıklama
COMMENT ON COLUMN employees.shift_rotation_order IS 'Vardiya rotasyonundaki sıra numarası';
COMMENT ON COLUMN shift_assignments.is_off_day IS 'İzinli gün olup olmadığı';
