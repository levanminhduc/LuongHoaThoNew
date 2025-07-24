-- =====================================================
-- PAYROLL COLUMN ANALYSIS FUNCTION
-- =====================================================
-- This function analyzes which columns in payrolls table have actual data
-- to help with smart template export (exclude empty columns)

-- Drop existing function if exists
DROP FUNCTION IF EXISTS analyze_payroll_columns();

-- Create function to analyze payroll columns
CREATE OR REPLACE FUNCTION analyze_payroll_columns()
RETURNS TABLE (
  column_name text,
  total_records bigint,
  non_null_count bigint,
  non_zero_count bigint,
  has_data boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'he_so_lam_viec'::text as column_name,
    COUNT(*)::bigint as total_records,
    COUNT(p.he_so_lam_viec)::bigint as non_null_count,
    COUNT(CASE WHEN p.he_so_lam_viec != 0 THEN 1 END)::bigint as non_zero_count,
    (COUNT(p.he_so_lam_viec) > 0 OR COUNT(CASE WHEN p.he_so_lam_viec != 0 THEN 1 END) > 0)::boolean as has_data
  FROM payrolls p
  
  UNION ALL
  
  SELECT 
    'he_so_phu_cap_ket_qua'::text,
    COUNT(*)::bigint,
    COUNT(p.he_so_phu_cap_ket_qua)::bigint,
    COUNT(CASE WHEN p.he_so_phu_cap_ket_qua != 0 THEN 1 END)::bigint,
    (COUNT(p.he_so_phu_cap_ket_qua) > 0 OR COUNT(CASE WHEN p.he_so_phu_cap_ket_qua != 0 THEN 1 END) > 0)::boolean
  FROM payrolls p
  
  UNION ALL
  
  SELECT 
    'he_so_luong_co_ban'::text,
    COUNT(*)::bigint,
    COUNT(p.he_so_luong_co_ban)::bigint,
    COUNT(CASE WHEN p.he_so_luong_co_ban != 0 THEN 1 END)::bigint,
    (COUNT(p.he_so_luong_co_ban) > 0 OR COUNT(CASE WHEN p.he_so_luong_co_ban != 0 THEN 1 END) > 0)::boolean
  FROM payrolls p
  
  UNION ALL
  
  SELECT 
    'luong_toi_thieu_cty'::text,
    COUNT(*)::bigint,
    COUNT(p.luong_toi_thieu_cty)::bigint,
    COUNT(CASE WHEN p.luong_toi_thieu_cty != 0 THEN 1 END)::bigint,
    (COUNT(p.luong_toi_thieu_cty) > 0 OR COUNT(CASE WHEN p.luong_toi_thieu_cty != 0 THEN 1 END) > 0)::boolean
  FROM payrolls p
  
  UNION ALL
  
  SELECT 
    'ngay_cong_trong_gio'::text,
    COUNT(*)::bigint,
    COUNT(p.ngay_cong_trong_gio)::bigint,
    COUNT(CASE WHEN p.ngay_cong_trong_gio != 0 THEN 1 END)::bigint,
    (COUNT(p.ngay_cong_trong_gio) > 0 OR COUNT(CASE WHEN p.ngay_cong_trong_gio != 0 THEN 1 END) > 0)::boolean
  FROM payrolls p
  
  UNION ALL
  
  SELECT 
    'gio_cong_tang_ca'::text,
    COUNT(*)::bigint,
    COUNT(p.gio_cong_tang_ca)::bigint,
    COUNT(CASE WHEN p.gio_cong_tang_ca != 0 THEN 1 END)::bigint,
    (COUNT(p.gio_cong_tang_ca) > 0 OR COUNT(CASE WHEN p.gio_cong_tang_ca != 0 THEN 1 END) > 0)::boolean
  FROM payrolls p
  
  UNION ALL
  
  SELECT 
    'tong_luong_san_pham_cong_doan'::text,
    COUNT(*)::bigint,
    COUNT(p.tong_luong_san_pham_cong_doan)::bigint,
    COUNT(CASE WHEN p.tong_luong_san_pham_cong_doan != 0 THEN 1 END)::bigint,
    (COUNT(p.tong_luong_san_pham_cong_doan) > 0 OR COUNT(CASE WHEN p.tong_luong_san_pham_cong_doan != 0 THEN 1 END) > 0)::boolean
  FROM payrolls p
  
  UNION ALL
  
  SELECT 
    'tien_luong_thuc_nhan_cuoi_ky'::text,
    COUNT(*)::bigint,
    COUNT(p.tien_luong_thuc_nhan_cuoi_ky)::bigint,
    COUNT(CASE WHEN p.tien_luong_thuc_nhan_cuoi_ky != 0 THEN 1 END)::bigint,
    (COUNT(p.tien_luong_thuc_nhan_cuoi_ky) > 0 OR COUNT(CASE WHEN p.tien_luong_thuc_nhan_cuoi_ky != 0 THEN 1 END) > 0)::boolean
  FROM payrolls p
  
  UNION ALL
  
  SELECT 
    'tong_cong_tien_luong'::text,
    COUNT(*)::bigint,
    COUNT(p.tong_cong_tien_luong)::bigint,
    COUNT(CASE WHEN p.tong_cong_tien_luong != 0 THEN 1 END)::bigint,
    (COUNT(p.tong_cong_tien_luong) > 0 OR COUNT(CASE WHEN p.tong_cong_tien_luong != 0 THEN 1 END) > 0)::boolean
  FROM payrolls p
  
  UNION ALL
  
  SELECT 
    'thue_tncn'::text,
    COUNT(*)::bigint,
    COUNT(p.thue_tncn)::bigint,
    COUNT(CASE WHEN p.thue_tncn != 0 THEN 1 END)::bigint,
    (COUNT(p.thue_tncn) > 0 OR COUNT(CASE WHEN p.thue_tncn != 0 THEN 1 END) > 0)::boolean
  FROM payrolls p
  
  UNION ALL
  
  SELECT 
    'tam_ung'::text,
    COUNT(*)::bigint,
    COUNT(p.tam_ung)::bigint,
    COUNT(CASE WHEN p.tam_ung != 0 THEN 1 END)::bigint,
    (COUNT(p.tam_ung) > 0 OR COUNT(CASE WHEN p.tam_ung != 0 THEN 1 END) > 0)::boolean
  FROM payrolls p
  
  UNION ALL
  
  SELECT 
    'bhxh_bhtn_bhyt_total'::text,
    COUNT(*)::bigint,
    COUNT(p.bhxh_bhtn_bhyt_total)::bigint,
    COUNT(CASE WHEN p.bhxh_bhtn_bhyt_total != 0 THEN 1 END)::bigint,
    (COUNT(p.bhxh_bhtn_bhyt_total) > 0 OR COUNT(CASE WHEN p.bhxh_bhtn_bhyt_total != 0 THEN 1 END) > 0)::boolean
  FROM payrolls p;
  
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION analyze_payroll_columns() TO authenticated;

-- Add comment
COMMENT ON FUNCTION analyze_payroll_columns() IS 
'Analyze which payroll columns have actual data to optimize template export';

-- Create a simpler version that returns just active columns
CREATE OR REPLACE FUNCTION get_active_payroll_columns()
RETURNS TABLE (column_name text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT col.column_name::text
  FROM (
    SELECT 'employee_id' as column_name, true as has_data
    UNION ALL
    SELECT 'salary_month', true
    UNION ALL
    SELECT 'he_so_lam_viec', (SELECT COUNT(*) > 0 FROM payrolls WHERE he_so_lam_viec != 0)
    UNION ALL
    SELECT 'he_so_phu_cap_ket_qua', (SELECT COUNT(*) > 0 FROM payrolls WHERE he_so_phu_cap_ket_qua != 0)
    UNION ALL
    SELECT 'he_so_luong_co_ban', (SELECT COUNT(*) > 0 FROM payrolls WHERE he_so_luong_co_ban != 0)
    UNION ALL
    SELECT 'luong_toi_thieu_cty', (SELECT COUNT(*) > 0 FROM payrolls WHERE luong_toi_thieu_cty != 0)
    UNION ALL
    SELECT 'tien_luong_thuc_nhan_cuoi_ky', (SELECT COUNT(*) > 0 FROM payrolls WHERE tien_luong_thuc_nhan_cuoi_ky != 0)
    UNION ALL
    SELECT 'tong_cong_tien_luong', (SELECT COUNT(*) > 0 FROM payrolls WHERE tong_cong_tien_luong != 0)
    UNION ALL
    SELECT 'thue_tncn', (SELECT COUNT(*) > 0 FROM payrolls WHERE thue_tncn != 0)
    UNION ALL
    SELECT 'tam_ung', (SELECT COUNT(*) > 0 FROM payrolls WHERE tam_ung != 0)
    UNION ALL
    SELECT 'bhxh_bhtn_bhyt_total', (SELECT COUNT(*) > 0 FROM payrolls WHERE bhxh_bhtn_bhyt_total != 0)
  ) col
  WHERE col.has_data = true;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_active_payroll_columns() TO authenticated;
