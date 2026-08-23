-- SCRIPT 33: BONUS TABLES (employee_bonuses + bonus_management_signatures + sign_bonus)
-- Upload & tra cứu tiền thưởng (Thưởng Lễ / Quý / Nóng). Import tĩnh 100%, không tính toán lại.
-- Idempotent: dùng IF NOT EXISTS + CREATE OR REPLACE, chạy lại an toàn. Không ALTER bảng hiện có.

-- ===== BẢNG employee_bonuses =====
CREATE TABLE IF NOT EXISTS employee_bonuses (
  id SERIAL PRIMARY KEY,
  employee_id VARCHAR(50) NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
  bonus_type VARCHAR(30) NOT NULL,
  bonus_period VARCHAR(20) NOT NULL,
  bonus_title VARCHAR(150),
  amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  detail_data JSONB NOT NULL DEFAULT '[]',
  source_file VARCHAR(255),
  import_batch_id VARCHAR(100),
  is_signed BOOLEAN DEFAULT false,
  signed_at TIMESTAMP NULL,
  signed_by_name VARCHAR(255) NULL,
  signature_ip VARCHAR(45) NULL,
  signature_device TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (employee_id, bonus_type, bonus_period)
);

CREATE INDEX IF NOT EXISTS idx_employee_bonuses_type_period
  ON employee_bonuses (bonus_type, bonus_period);
CREATE INDEX IF NOT EXISTS idx_employee_bonuses_employee
  ON employee_bonuses (employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_bonuses_batch
  ON employee_bonuses (import_batch_id);

COMMENT ON TABLE employee_bonuses IS 'Dữ liệu tiền thưởng theo đợt (import tĩnh 100%). Định danh đợt = (bonus_type, bonus_period).';
COMMENT ON COLUMN employee_bonuses.bonus_type IS 'Loại thưởng (validate app-layer zod enum): thuong_le, thuong_quy, thuong_nong, khac';
COMMENT ON COLUMN employee_bonuses.bonus_period IS 'Kỳ thưởng định dạng YYYY-Mã (ví dụ 2026-Q2, 2026-0209, 2026-6T)';
COMMENT ON COLUMN employee_bonuses.bonus_title IS 'Tiêu đề đợt thưởng (ví dụ: Thưởng 10% TB 6 tháng đầu năm 2026)';
COMMENT ON COLUMN employee_bonuses.amount IS 'Số tiền thưởng (VND) - lấy nguyên từ cột được chỉ định, không tính lại';
COMMENT ON COLUMN employee_bonuses.detail_data IS 'Mảng có thứ tự [{"label": "Lương Tháng 01", "value": 8500000}, ...]; value là number hoặc string, lưu nguyên từ Excel';

-- ===== BẢNG bonus_management_signatures =====
CREATE TABLE IF NOT EXISTS bonus_management_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signature_type VARCHAR(20) NOT NULL
    CHECK (signature_type IN ('giam_doc', 'ke_toan', 'nguoi_lap_bieu')),
  bonus_type VARCHAR(30) NOT NULL,
  bonus_period VARCHAR(20) NOT NULL,
  signed_by_id VARCHAR(50) NOT NULL,
  signed_by_name VARCHAR(255) NOT NULL,
  department VARCHAR(100),
  signed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address VARCHAR(45),
  device_info TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bonus_mgmt_sig_type_period
  ON bonus_management_signatures (bonus_type, bonus_period);
CREATE INDEX IF NOT EXISTS idx_bonus_mgmt_sig_signature_type
  ON bonus_management_signatures (signature_type);
CREATE INDEX IF NOT EXISTS idx_bonus_mgmt_sig_signed_by
  ON bonus_management_signatures (signed_by_id);

-- Mỗi chức vụ chỉ ký 1 lần/đợt thưởng
CREATE UNIQUE INDEX IF NOT EXISTS idx_bonus_mgmt_sig_unique
  ON bonus_management_signatures (bonus_type, bonus_period, signature_type)
  WHERE is_active = true;

COMMENT ON TABLE bonus_management_signatures IS 'Chữ ký quản lý cho từng đợt thưởng: giam_doc, ke_toan, nguoi_lap_bieu. Key theo (bonus_type, bonus_period).';
COMMENT ON COLUMN bonus_management_signatures.signature_type IS 'Loại chữ ký: giam_doc, ke_toan, nguoi_lap_bieu';
COMMENT ON COLUMN bonus_management_signatures.bonus_period IS 'Kỳ thưởng định dạng YYYY-Mã';

-- ===== FUNCTION sign_bonus (nhân viên ký nhận, giờ Việt Nam) =====
CREATE OR REPLACE FUNCTION sign_bonus(
  p_employee_id VARCHAR(50),
  p_bonus_type VARCHAR(30),
  p_bonus_period VARCHAR(20),
  p_ip_address VARCHAR(45) DEFAULT NULL,
  p_device_info TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_bonus employee_bonuses%ROWTYPE;
  v_employee_name VARCHAR(255);
  v_current_time TIMESTAMP;
BEGIN
  v_current_time := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh');

  SELECT * INTO v_bonus
  FROM employee_bonuses
  WHERE employee_id = p_employee_id
    AND bonus_type = p_bonus_type
    AND bonus_period = p_bonus_period
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'BONUS_NOT_FOUND');
  END IF;

  IF v_bonus.is_signed = true THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'ALREADY_SIGNED',
      'signed_at', v_bonus.signed_at,
      'signed_by_name', v_bonus.signed_by_name
    );
  END IF;

  SELECT full_name INTO v_employee_name
  FROM employees
  WHERE employee_id = p_employee_id;

  UPDATE employee_bonuses SET
    is_signed = true,
    signed_at = v_current_time,
    signed_by_name = v_employee_name,
    signature_ip = p_ip_address,
    signature_device = p_device_info,
    updated_at = v_current_time
  WHERE employee_id = p_employee_id
    AND bonus_type = p_bonus_type
    AND bonus_period = p_bonus_period;

  RETURN jsonb_build_object(
    'success', true,
    'signed_at', v_current_time,
    'signed_by_name', v_employee_name
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION sign_bonus IS 'Nhân viên ký nhận 1 đợt thưởng (atomic FOR UPDATE, giờ Việt Nam). 3 nhánh: BONUS_NOT_FOUND / ALREADY_SIGNED / success.';

-- ===== RLS (chỉ service role trong API routes truy cập, không policy anon) =====
ALTER TABLE employee_bonuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE bonus_management_signatures ENABLE ROW LEVEL SECURITY;

SELECT 'BONUS TABLES + sign_bonus CREATED SUCCESSFULLY' AS status;
