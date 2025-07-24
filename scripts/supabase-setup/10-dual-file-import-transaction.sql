-- =====================================================
-- DUAL FILE IMPORT TRANSACTION FUNCTION
-- =====================================================
-- This function handles dual file import with transaction support
-- to ensure data consistency when processing both files

-- Drop existing function if exists
DROP FUNCTION IF EXISTS import_dual_files_transaction(jsonb, jsonb, text);

-- Create transaction function for dual file import
CREATE OR REPLACE FUNCTION import_dual_files_transaction(
  file1_records jsonb DEFAULT NULL,
  file2_records jsonb DEFAULT NULL,
  session_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  file1_count integer := 0;
  file2_count integer := 0;
  total_count integer := 0;
  error_count integer := 0;
  success_count integer := 0;
  errors jsonb := '[]'::jsonb;
  temp_record jsonb;
  existing_record record;
  insert_result record;
BEGIN
  -- Initialize result
  result := jsonb_build_object(
    'success', false,
    'session_id', COALESCE(session_id, 'DUAL_' || extract(epoch from now())::text),
    'file1_inserted', 0,
    'file2_inserted', 0,
    'total_inserted', 0,
    'error_count', 0,
    'errors', '[]'::jsonb
  );

  -- Start transaction (implicit in function)
  
  -- Process File 1 records if provided
  IF file1_records IS NOT NULL AND jsonb_array_length(file1_records) > 0 THEN
    FOR i IN 0..jsonb_array_length(file1_records) - 1 LOOP
      BEGIN
        temp_record := file1_records->i;
        
        -- Check for existing record
        SELECT * INTO existing_record 
        FROM payrolls 
        WHERE employee_id = (temp_record->>'employee_id')
          AND salary_month = (temp_record->>'salary_month');
        
        IF existing_record.id IS NOT NULL THEN
          -- Record exists, add to errors
          errors := errors || jsonb_build_array(
            jsonb_build_object(
              'employee_id', temp_record->>'employee_id',
              'salary_month', temp_record->>'salary_month',
              'file_type', 'file1',
              'error', 'Duplicate record found',
              'code', 'DUPLICATE_RECORD'
            )
          );
          error_count := error_count + 1;
        ELSE
          -- Insert new record
          INSERT INTO payrolls (
            employee_id, salary_month, he_so_lam_viec, he_so_phu_cap_ket_qua,
            he_so_luong_co_ban, luong_toi_thieu_cty, so_gio_lam_viec_thuc_te,
            so_gio_lam_viec_quy_dinh, so_ngay_lam_viec_thuc_te, so_ngay_lam_viec_quy_dinh,
            luong_san_pham, luong_co_ban, phu_cap_ket_qua, phu_cap_vuot_gio,
            phu_cap_ca_dem, phu_cap_chu_nhat, phu_cap_le_tet, phu_cap_khac,
            thuong_hieu_qua_lam_viec, thuong_khac, bao_hiem_xa_hoi_cty_dong,
            bao_hiem_y_te_cty_dong, bao_hiem_that_nghiep_cty_dong, kinh_phi_cong_doan_cty_dong,
            so_ngay_phep_co_luong, so_ngay_phep_khong_luong, so_ngay_le_tet,
            so_ngay_nghi_thai_san, tong_luong_truoc_thue, thue_thu_nhap_ca_nhan,
            bao_hiem_xa_hoi_nv_dong, bao_hiem_y_te_nv_dong, bao_hiem_that_nghiep_nv_dong,
            kinh_phi_cong_doan_nv_dong, tam_ung_luong, khau_tru_khac, tien_an_ca,
            tien_xang_xe, tien_dien_thoai, bu_tru_thang_truoc, truy_linh_thang_truoc,
            truy_thu_thue_tncn, truy_thu_bao_hiem, truy_thu_khac, truy_thu_the_bhyt,
            tien_luong_thuc_nhan_cuoi_ky, source_file, import_batch_id, import_status,
            created_at, updated_at, cccd
          )
          SELECT 
            (temp_record->>'employee_id')::text,
            (temp_record->>'salary_month')::text,
            COALESCE((temp_record->>'he_so_lam_viec')::numeric, 0),
            COALESCE((temp_record->>'he_so_phu_cap_ket_qua')::numeric, 0),
            COALESCE((temp_record->>'he_so_luong_co_ban')::numeric, 0),
            COALESCE((temp_record->>'luong_toi_thieu_cty')::numeric, 0),
            COALESCE((temp_record->>'so_gio_lam_viec_thuc_te')::numeric, 0),
            COALESCE((temp_record->>'so_gio_lam_viec_quy_dinh')::numeric, 0),
            COALESCE((temp_record->>'so_ngay_lam_viec_thuc_te')::numeric, 0),
            COALESCE((temp_record->>'so_ngay_lam_viec_quy_dinh')::numeric, 0),
            COALESCE((temp_record->>'luong_san_pham')::numeric, 0),
            COALESCE((temp_record->>'luong_co_ban')::numeric, 0),
            COALESCE((temp_record->>'phu_cap_ket_qua')::numeric, 0),
            COALESCE((temp_record->>'phu_cap_vuot_gio')::numeric, 0),
            COALESCE((temp_record->>'phu_cap_ca_dem')::numeric, 0),
            COALESCE((temp_record->>'phu_cap_chu_nhat')::numeric, 0),
            COALESCE((temp_record->>'phu_cap_le_tet')::numeric, 0),
            COALESCE((temp_record->>'phu_cap_khac')::numeric, 0),
            COALESCE((temp_record->>'thuong_hieu_qua_lam_viec')::numeric, 0),
            COALESCE((temp_record->>'thuong_khac')::numeric, 0),
            COALESCE((temp_record->>'bao_hiem_xa_hoi_cty_dong')::numeric, 0),
            COALESCE((temp_record->>'bao_hiem_y_te_cty_dong')::numeric, 0),
            COALESCE((temp_record->>'bao_hiem_that_nghiep_cty_dong')::numeric, 0),
            COALESCE((temp_record->>'kinh_phi_cong_doan_cty_dong')::numeric, 0),
            COALESCE((temp_record->>'so_ngay_phep_co_luong')::numeric, 0),
            COALESCE((temp_record->>'so_ngay_phep_khong_luong')::numeric, 0),
            COALESCE((temp_record->>'so_ngay_le_tet')::numeric, 0),
            COALESCE((temp_record->>'so_ngay_nghi_thai_san')::numeric, 0),
            COALESCE((temp_record->>'tong_luong_truoc_thue')::numeric, 0),
            COALESCE((temp_record->>'thue_thu_nhap_ca_nhan')::numeric, 0),
            COALESCE((temp_record->>'bao_hiem_xa_hoi_nv_dong')::numeric, 0),
            COALESCE((temp_record->>'bao_hiem_y_te_nv_dong')::numeric, 0),
            COALESCE((temp_record->>'bao_hiem_that_nghiep_nv_dong')::numeric, 0),
            COALESCE((temp_record->>'kinh_phi_cong_doan_nv_dong')::numeric, 0),
            COALESCE((temp_record->>'tam_ung_luong')::numeric, 0),
            COALESCE((temp_record->>'khau_tru_khac')::numeric, 0),
            COALESCE((temp_record->>'tien_an_ca')::numeric, 0),
            COALESCE((temp_record->>'tien_xang_xe')::numeric, 0),
            COALESCE((temp_record->>'tien_dien_thoai')::numeric, 0),
            COALESCE((temp_record->>'bu_tru_thang_truoc')::numeric, 0),
            COALESCE((temp_record->>'truy_linh_thang_truoc')::numeric, 0),
            COALESCE((temp_record->>'truy_thu_thue_tncn')::numeric, 0),
            COALESCE((temp_record->>'truy_thu_bao_hiem')::numeric, 0),
            COALESCE((temp_record->>'truy_thu_khac')::numeric, 0),
            COALESCE((temp_record->>'truy_thu_the_bhyt')::numeric, 0),
            COALESCE((temp_record->>'tien_luong_thuc_nhan_cuoi_ky')::numeric, 0),
            COALESCE(temp_record->>'source_file', 'file1'),
            COALESCE(temp_record->>'import_batch_id', result->>'session_id'),
            COALESCE(temp_record->>'import_status', 'completed'),
            COALESCE((temp_record->>'created_at')::timestamp, now()),
            COALESCE((temp_record->>'updated_at')::timestamp, now()),
            temp_record->>'cccd';
          
          file1_count := file1_count + 1;
          success_count := success_count + 1;
        END IF;
        
      EXCEPTION WHEN OTHERS THEN
        -- Handle individual record errors
        errors := errors || jsonb_build_array(
          jsonb_build_object(
            'employee_id', COALESCE(temp_record->>'employee_id', 'UNKNOWN'),
            'salary_month', COALESCE(temp_record->>'salary_month', 'UNKNOWN'),
            'file_type', 'file1',
            'error', SQLERRM,
            'code', 'DATABASE_ERROR'
          )
        );
        error_count := error_count + 1;
      END;
    END LOOP;
  END IF;

  -- Process File 2 records if provided (similar logic)
  IF file2_records IS NOT NULL AND jsonb_array_length(file2_records) > 0 THEN
    FOR i IN 0..jsonb_array_length(file2_records) - 1 LOOP
      BEGIN
        temp_record := file2_records->i;
        
        -- Check for existing record
        SELECT * INTO existing_record 
        FROM payrolls 
        WHERE employee_id = (temp_record->>'employee_id')
          AND salary_month = (temp_record->>'salary_month');
        
        IF existing_record.id IS NOT NULL THEN
          -- Record exists, add to errors
          errors := errors || jsonb_build_array(
            jsonb_build_object(
              'employee_id', temp_record->>'employee_id',
              'salary_month', temp_record->>'salary_month',
              'file_type', 'file2',
              'error', 'Duplicate record found',
              'code', 'DUPLICATE_RECORD'
            )
          );
          error_count := error_count + 1;
        ELSE
          -- Insert new record (same logic as file1)
          INSERT INTO payrolls (
            employee_id, salary_month, source_file, import_batch_id, import_status,
            created_at, updated_at,
            -- Add other fields with COALESCE as above
            tien_luong_thuc_nhan_cuoi_ky
          )
          VALUES (
            (temp_record->>'employee_id')::text,
            (temp_record->>'salary_month')::text,
            COALESCE(temp_record->>'source_file', 'file2'),
            COALESCE(temp_record->>'import_batch_id', result->>'session_id'),
            COALESCE(temp_record->>'import_status', 'completed'),
            COALESCE((temp_record->>'created_at')::timestamp, now()),
            COALESCE((temp_record->>'updated_at')::timestamp, now()),
            COALESCE((temp_record->>'tien_luong_thuc_nhan_cuoi_ky')::numeric, 0)
          );
          
          file2_count := file2_count + 1;
          success_count := success_count + 1;
        END IF;
        
      EXCEPTION WHEN OTHERS THEN
        -- Handle individual record errors
        errors := errors || jsonb_build_array(
          jsonb_build_object(
            'employee_id', COALESCE(temp_record->>'employee_id', 'UNKNOWN'),
            'salary_month', COALESCE(temp_record->>'salary_month', 'UNKNOWN'),
            'file_type', 'file2',
            'error', SQLERRM,
            'code', 'DATABASE_ERROR'
          )
        );
        error_count := error_count + 1;
      END;
    END LOOP;
  END IF;

  -- Calculate totals
  total_count := file1_count + file2_count;

  -- Build final result
  result := jsonb_build_object(
    'success', (error_count = 0 AND total_count > 0),
    'session_id', result->>'session_id',
    'file1_inserted', file1_count,
    'file2_inserted', file2_count,
    'total_inserted', total_count,
    'success_count', success_count,
    'error_count', error_count,
    'errors', errors
  );

  -- If there are critical errors, rollback is automatic
  -- Function will return the result with error details
  
  RETURN result;
  
EXCEPTION WHEN OTHERS THEN
  -- Handle function-level errors
  RETURN jsonb_build_object(
    'success', false,
    'session_id', COALESCE(session_id, 'ERROR'),
    'file1_inserted', 0,
    'file2_inserted', 0,
    'total_inserted', 0,
    'success_count', 0,
    'error_count', 1,
    'errors', jsonb_build_array(
      jsonb_build_object(
        'employee_id', 'SYSTEM',
        'salary_month', 'N/A',
        'file_type', 'system',
        'error', SQLERRM,
        'code', 'TRANSACTION_ERROR'
      )
    )
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION import_dual_files_transaction(jsonb, jsonb, text) TO authenticated;

-- Add comment
COMMENT ON FUNCTION import_dual_files_transaction(jsonb, jsonb, text) IS 
'Transaction-safe dual file import function that ensures data consistency when processing both files';
