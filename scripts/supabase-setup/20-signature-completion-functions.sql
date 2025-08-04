-- SCRIPT 20: SIGNATURE COMPLETION FUNCTIONS
-- Functions để tính toán completion percentage và validation logic

-- ===== FUNCTION: CALCULATE EMPLOYEE SIGNATURE COMPLETION =====
CREATE OR REPLACE FUNCTION calculate_employee_signature_completion(target_month VARCHAR(7))
RETURNS TABLE (
  total_employees INTEGER,
  signed_employees INTEGER,
  completion_percentage DECIMAL(5,2),
  is_100_percent_complete BOOLEAN,
  unsigned_employees_sample JSONB
) AS $$
DECLARE
  total_count INTEGER;
  signed_count INTEGER;
  completion_pct DECIMAL(5,2);
  is_complete BOOLEAN;
  unsigned_sample JSONB;
BEGIN
  -- Count total active employees
  SELECT COUNT(*) INTO total_count
  FROM employees 
  WHERE is_active = true;
  
  -- Count employees who signed for the target month
  SELECT COUNT(DISTINCT employee_id) INTO signed_count
  FROM signature_logs 
  WHERE salary_month = target_month 
    AND is_active = true;
  
  -- Calculate completion percentage
  IF total_count > 0 THEN
    completion_pct := ROUND((signed_count::DECIMAL / total_count::DECIMAL) * 100, 2);
    is_complete := (signed_count = total_count);
  ELSE
    completion_pct := 0;
    is_complete := false;
  END IF;
  
  -- Get sample of unsigned employees (max 10)
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'employee_id', e.employee_id,
        'full_name', e.full_name,
        'department', e.department,
        'chuc_vu', e.chuc_vu
      )
    ), 
    '[]'::jsonb
  ) INTO unsigned_sample
  FROM employees e
  WHERE e.is_active = true
    AND NOT EXISTS (
      SELECT 1 FROM signature_logs sl 
      WHERE sl.employee_id = e.employee_id 
        AND sl.salary_month = target_month 
        AND sl.is_active = true
    )
  LIMIT 10;
  
  RETURN QUERY SELECT 
    total_count,
    signed_count,
    completion_pct,
    is_complete,
    unsigned_sample;
END;
$$ LANGUAGE plpgsql;

-- ===== FUNCTION: CHECK MANAGEMENT SIGNATURE ELIGIBILITY =====
CREATE OR REPLACE FUNCTION check_management_signature_eligibility(
  target_month VARCHAR(7),
  signature_type VARCHAR(20),
  employee_id VARCHAR(50)
)
RETURNS TABLE (
  is_eligible BOOLEAN,
  reason VARCHAR(255),
  employee_completion JSONB,
  existing_signature JSONB
) AS $$
DECLARE
  completion_data RECORD;
  existing_sig RECORD;
  employee_record RECORD;
  eligibility BOOLEAN := false;
  reason_text VARCHAR(255) := '';
BEGIN
  -- Validate signature type
  IF signature_type NOT IN ('giam_doc', 'ke_toan', 'nguoi_lap_bieu') THEN
    reason_text := 'Invalid signature type';
    RETURN QUERY SELECT false, reason_text, '{}'::jsonb, '{}'::jsonb;
    RETURN;
  END IF;
  
  -- Check if employee exists and has correct role
  SELECT * INTO employee_record
  FROM employees 
  WHERE employees.employee_id = check_management_signature_eligibility.employee_id
    AND is_active = true;
    
  IF NOT FOUND THEN
    reason_text := 'Employee not found or inactive';
    RETURN QUERY SELECT false, reason_text, '{}'::jsonb, '{}'::jsonb;
    RETURN;
  END IF;
  
  -- Check if employee has correct role for signature type
  IF employee_record.chuc_vu != signature_type THEN
    reason_text := 'Employee role does not match signature type';
    RETURN QUERY SELECT false, reason_text, '{}'::jsonb, '{}'::jsonb;
    RETURN;
  END IF;
  
  -- Get employee completion data
  SELECT * INTO completion_data
  FROM calculate_employee_signature_completion(target_month);
  
  -- Check if 100% completion is achieved
  IF NOT completion_data.is_100_percent_complete THEN
    reason_text := 'Employee signature completion is not 100%';
    RETURN QUERY SELECT 
      false, 
      reason_text, 
      jsonb_build_object(
        'total_employees', completion_data.total_employees,
        'signed_employees', completion_data.signed_employees,
        'completion_percentage', completion_data.completion_percentage,
        'unsigned_employees_sample', completion_data.unsigned_employees_sample
      ),
      '{}'::jsonb;
    RETURN;
  END IF;
  
  -- Check if signature already exists for this month and type
  SELECT * INTO existing_sig
  FROM management_signatures 
  WHERE salary_month = target_month 
    AND management_signatures.signature_type = check_management_signature_eligibility.signature_type
    AND is_active = true;
    
  IF FOUND THEN
    reason_text := 'Signature already exists for this month and type';
    RETURN QUERY SELECT 
      false, 
      reason_text,
      jsonb_build_object(
        'total_employees', completion_data.total_employees,
        'signed_employees', completion_data.signed_employees,
        'completion_percentage', completion_data.completion_percentage
      ),
      jsonb_build_object(
        'id', existing_sig.id,
        'signed_by_id', existing_sig.signed_by_id,
        'signed_by_name', existing_sig.signed_by_name,
        'signed_at', existing_sig.signed_at,
        'department', existing_sig.department
      );
    RETURN;
  END IF;
  
  -- All checks passed
  eligibility := true;
  reason_text := 'Eligible for signature';
  
  RETURN QUERY SELECT 
    eligibility, 
    reason_text,
    jsonb_build_object(
      'total_employees', completion_data.total_employees,
      'signed_employees', completion_data.signed_employees,
      'completion_percentage', completion_data.completion_percentage
    ),
    '{}'::jsonb;
END;
$$ LANGUAGE plpgsql;

-- ===== FUNCTION: GET MANAGEMENT SIGNATURE STATUS =====
CREATE OR REPLACE FUNCTION get_management_signature_status(target_month VARCHAR(7))
RETURNS TABLE (
  month VARCHAR(7),
  employee_completion JSONB,
  signatures JSONB,
  summary JSONB
) AS $$
DECLARE
  completion_data RECORD;
  signatures_data JSONB;
  summary_data JSONB;
BEGIN
  -- Get employee completion data
  SELECT * INTO completion_data
  FROM calculate_employee_signature_completion(target_month);
  
  -- Get existing management signatures
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', id,
        'signature_type', signature_type,
        'signed_by_id', signed_by_id,
        'signed_by_name', signed_by_name,
        'department', department,
        'signed_at', signed_at,
        'notes', notes
      ) ORDER BY signed_at
    ),
    '[]'::jsonb
  ) INTO signatures_data
  FROM management_signatures 
  WHERE salary_month = target_month 
    AND is_active = true;
  
  -- Build summary
  SELECT jsonb_build_object(
    'total_signature_types', 3,
    'completed_signatures', (
      SELECT COUNT(*) 
      FROM management_signatures 
      WHERE salary_month = target_month AND is_active = true
    ),
    'remaining_signatures', ARRAY(
      SELECT unnest(ARRAY['giam_doc', 'ke_toan', 'nguoi_lap_bieu'])
      EXCEPT
      SELECT signature_type 
      FROM management_signatures 
      WHERE salary_month = target_month AND is_active = true
    ),
    'is_fully_signed', (
      SELECT COUNT(*) = 3
      FROM management_signatures 
      WHERE salary_month = target_month AND is_active = true
    ),
    'employee_completion_required', completion_data.is_100_percent_complete
  ) INTO summary_data;
  
  RETURN QUERY SELECT 
    target_month,
    jsonb_build_object(
      'total_employees', completion_data.total_employees,
      'signed_employees', completion_data.signed_employees,
      'completion_percentage', completion_data.completion_percentage,
      'is_100_percent_complete', completion_data.is_100_percent_complete,
      'unsigned_employees_sample', completion_data.unsigned_employees_sample
    ),
    signatures_data,
    summary_data;
END;
$$ LANGUAGE plpgsql;

-- ===== ADD COMMENTS =====
COMMENT ON FUNCTION calculate_employee_signature_completion(VARCHAR) IS 'Tính toán tỷ lệ hoàn thành ký tên của nhân viên cho tháng cụ thể';
COMMENT ON FUNCTION check_management_signature_eligibility(VARCHAR, VARCHAR, VARCHAR) IS 'Kiểm tra điều kiện ký xác nhận của management cho tháng và loại chữ ký cụ thể';
COMMENT ON FUNCTION get_management_signature_status(VARCHAR) IS 'Lấy trạng thái tổng quan của management signatures cho tháng cụ thể';

-- ===== VERIFICATION =====
SELECT 'SIGNATURE COMPLETION FUNCTIONS CREATED SUCCESSFULLY' as status;

-- Test functions with current month
DO $$
DECLARE
  current_month VARCHAR(7) := to_char(CURRENT_DATE, 'YYYY-MM');
  test_result RECORD;
BEGIN
  -- Test calculate_employee_signature_completion
  SELECT * INTO test_result FROM calculate_employee_signature_completion(current_month);
  RAISE NOTICE 'Employee completion for %: % of % employees (%.2f%%)', 
    current_month, test_result.signed_employees, test_result.total_employees, test_result.completion_percentage;
    
  -- Test get_management_signature_status  
  PERFORM get_management_signature_status(current_month);
  RAISE NOTICE 'Management signature status function tested successfully';
END $$;

SELECT 'BUSINESS LOGIC FUNCTIONS SETUP COMPLETED' as result;
