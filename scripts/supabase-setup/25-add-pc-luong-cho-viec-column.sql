-- MIGRATION: Add pc_luong_cho_viec column to payrolls table
-- Date: 2025-01-09
-- Description: Thêm cột phụ cấp lương cho việc vào bảng payrolls

-- Add new column to payrolls table
ALTER TABLE payrolls 
ADD COLUMN IF NOT EXISTS pc_luong_cho_viec DECIMAL(15,2) DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN payrolls.pc_luong_cho_viec IS 'Phụ cấp lương cho việc';

-- Update existing records to have default value 0
UPDATE payrolls 
SET pc_luong_cho_viec = 0 
WHERE pc_luong_cho_viec IS NULL;

-- Verify the column was added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'payrolls' 
  AND column_name = 'pc_luong_cho_viec';

