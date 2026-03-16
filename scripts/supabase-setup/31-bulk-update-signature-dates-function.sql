-- =====================================================
-- MIGRATION: bulk_update_signature_dates FUNCTION
-- =====================================================
-- Purpose: Batch-update signature timestamps (signed_at) for a list of
--          employees in a given salary month, assigning each employee a
--          random timestamp within a configurable date range.
--          Both payrolls.signed_at and signature_logs.signed_at are updated
--          to the SAME random value so audit trails remain consistent.
-- Date: 2026-03-16
-- =====================================================

DROP FUNCTION IF EXISTS bulk_update_signature_dates(VARCHAR[], VARCHAR, DATE, INT, BOOLEAN);

CREATE OR REPLACE FUNCTION bulk_update_signature_dates(
  p_employee_ids      VARCHAR[],
  p_salary_month      VARCHAR,
  p_base_date         DATE,
  p_random_range_days INT,
  p_is_t13            BOOLEAN
) RETURNS JSONB AS $$
DECLARE
  v_current_time      TIMESTAMP;
  v_success_count     INTEGER   := 0;
  v_error_count       INTEGER   := 0;
  v_errors            JSONB     := '[]'::JSONB;
  v_employee_id       VARCHAR;
  v_random_signed_at  TIMESTAMP;
  v_day_offset        INT;
  v_hour              INT;
  v_minute            INT;
  v_rows              INT;
BEGIN
  IF p_employee_ids IS NULL OR array_length(p_employee_ids, 1) IS NULL THEN
    RETURN jsonb_build_object(
      'success_count', 0,
      'error_count',   0,
      'errors',        '[]'::JSONB
    );
  END IF;

  v_current_time := CURRENT_TIMESTAMP + INTERVAL '7 hours';

  FOREACH v_employee_id IN ARRAY p_employee_ids
  LOOP
    BEGIN
      v_day_offset := floor(random() * (p_random_range_days + 1))::INT;
      v_hour       := floor(random() * 24)::INT;
      v_minute     := floor(random() * 60)::INT;

      v_random_signed_at :=
        p_base_date
        + v_day_offset * INTERVAL '1 day'
        + v_hour       * INTERVAL '1 hour'
        + v_minute     * INTERVAL '1 minute';

      IF p_is_t13 THEN
        UPDATE payrolls
        SET
          signed_at  = v_random_signed_at,
          updated_at = v_current_time
        WHERE employee_id  = v_employee_id
          AND salary_month = p_salary_month
          AND is_signed    = true
          AND payroll_type = 't13';
      ELSE
        UPDATE payrolls
        SET
          signed_at  = v_random_signed_at,
          updated_at = v_current_time
        WHERE employee_id  = v_employee_id
          AND salary_month = p_salary_month
          AND is_signed    = true
          AND (payroll_type = 'monthly' OR payroll_type IS NULL);
      END IF;

      GET DIAGNOSTICS v_rows = ROW_COUNT;
      IF v_rows = 0 THEN
        RAISE EXCEPTION 'No matching payroll record updated for employee % (month: %, is_t13: %)',
          v_employee_id, p_salary_month, p_is_t13;
      END IF;

      UPDATE signature_logs
      SET signed_at = v_random_signed_at
      WHERE employee_id  = v_employee_id
        AND salary_month = p_salary_month;

      GET DIAGNOSTICS v_rows = ROW_COUNT;
      IF v_rows = 0 THEN
        RAISE EXCEPTION 'No signature_logs record found for employee % (month: %)',
          v_employee_id, p_salary_month;
      END IF;

      v_success_count := v_success_count + 1;

    EXCEPTION WHEN OTHERS THEN
      v_error_count := v_error_count + 1;
      v_errors := v_errors || jsonb_build_object(
        'employee_id', v_employee_id,
        'error',       SQLERRM
      );
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'success_count', v_success_count,
    'error_count',   v_error_count,
    'errors',        v_errors
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION bulk_update_signature_dates IS
'Batch-update signature timestamps for a list of employees in a given salary month.
Each employee receives a unique random timestamp within [p_base_date, p_base_date + p_random_range_days]
at a random hour (0-23) and minute (0-59).
Both payrolls.signed_at and signature_logs.signed_at are set to the SAME random value.
payrolls.updated_at is set to the current Vietnam time (UTC+7).

Parameters:
- p_employee_ids:      Array of employee IDs to update
- p_salary_month:      Salary month in YYYY-MM format (also accepts YYYY-13 / YYYY-T13 for T13)
- p_base_date:         Earliest possible date for the generated timestamp
- p_random_range_days: Number of additional days (0-30) to randomise over (inclusive)
- p_is_t13:            TRUE  → filter payroll_type = ''t13''
                       FALSE → filter payroll_type = ''monthly'' OR NULL

Returns JSONB: { success_count, error_count, errors: [{employee_id, error}] }';
