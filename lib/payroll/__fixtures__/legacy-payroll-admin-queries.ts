import { sanitizePostgrestValue } from "@/lib/utils/postgrest-sanitize";
import type { SupabaseServiceClient } from "../payroll-self-repository";

/** app/api/admin/payroll-import/route.ts:324-329 tại commit 55b6e6e */
export function legacyDuplicatePayrollQuery(
  supabase: SupabaseServiceClient,
  employeeId: string,
  salaryMonth: string,
) {
  return supabase
    .from("payrolls")
    .select("id")
    .eq("employee_id", employeeId)
    .eq("salary_month", salaryMonth)
    .single();
}

/** app/api/admin/payroll-import/route.ts:348-352 tại commit 55b6e6e */
export function legacyUpdatePayrollQuery(
  supabase: SupabaseServiceClient,
  employeeId: string,
  salaryMonth: string,
  updateData: Record<string, unknown>,
) {
  return supabase
    .from("payrolls")
    .update(updateData)
    .eq("employee_id", employeeId)
    .eq("salary_month", salaryMonth);
}

/** app/api/admin/payroll-import/route.ts:373-375 tại commit 55b6e6e */
export function legacyInsertPayrollQuery(
  supabase: SupabaseServiceClient,
  insertData: Record<string, unknown>,
) {
  return supabase.from("payrolls").insert(insertData);
}

/** app/api/admin/upload/route.ts:64-67 tại commit 55b6e6e */
export function legacyInsertPayrollBatchQuery(
  supabase: SupabaseServiceClient,
  rows: Record<string, unknown>[],
) {
  return supabase.from("payrolls").insert(rows).select();
}

/** app/api/admin/payroll-export/route.ts:52-113 tại commit 55b6e6e */
export function legacyPayrollExportQuery(
  supabase: SupabaseServiceClient,
  month: string | null,
  isT13: boolean,
  allowedDepartments: string[] | null,
  department: string | null,
) {
  let query = supabase
    .from("payrolls")
    .select(
      `
        *,
        employees!payrolls_employee_id_fkey!inner(
          full_name,
          department
        )
      `,
    )
    .order("employee_id");

  if (isT13) {
    query = query.eq("payroll_type", "t13");
  } else {
    query = query.or("payroll_type.eq.monthly,payroll_type.is.null");
  }

  if (month) {
    query = query.eq("salary_month", month);
  }

  if (allowedDepartments) {
    query = query.in("employees.department", allowedDepartments);
  }

  if (department) {
    query = query.eq("employees.department", department);
  }

  return query;
}

/** app/api/admin/payroll-export/route.ts:140-152 tại commit 55b6e6e */
export function legacyPayrollExportFallbackQuery(
  supabase: SupabaseServiceClient,
  month: string | null,
) {
  let fallbackQuery = supabase
    .from("payrolls")
    .select("*")
    .order("employee_id");

  if (month) {
    fallbackQuery = fallbackQuery.eq("salary_month", month);
  }

  return fallbackQuery;
}

/** app/api/admin/payroll-export/route.ts:156-160 tại commit 55b6e6e */
export function legacyAvailableMonthsQuery(supabase: SupabaseServiceClient) {
  return supabase
    .from("payrolls")
    .select("salary_month")
    .order("salary_month", { ascending: false })
    .limit(10);
}

/** app/api/admin/bulk-payroll-export/route.ts:256-270 tại commit 55b6e6e */
export function legacyBulkExportPayrollsQuery(
  supabase: SupabaseServiceClient,
  salaryMonth: string,
  isT13: boolean,
) {
  let payrollQuery = supabase
    .from("payrolls")
    .select(
      `*, employees!payrolls_employee_id_fkey!inner(full_name, department)`,
    )
    .eq("salary_month", salaryMonth)
    .order("employee_id");

  if (isT13) {
    payrollQuery = payrollQuery.eq("payroll_type", "t13");
  } else {
    payrollQuery = payrollQuery.or(
      "payroll_type.eq.monthly,payroll_type.is.null",
    );
  }

  return payrollQuery;
}

/** app/api/admin/sync-template/route.ts:21-25 tại commit 55b6e6e */
export function legacySamplePayrollsQuery(supabase: SupabaseServiceClient) {
  return supabase
    .from("payrolls")
    .select(
      "bhxh_21_5_percent, bhxh_bhtn_bhyt_total, bo_sung_luong, don_gia_tien_luong_tren_gio, employee_id, gio_an_ca, gio_cong_tang_ca, he_so_lam_viec, he_so_luong_co_ban, he_so_phu_cap_ket_qua, ho_tro_gui_con_nha_tre, ho_tro_thoi_tiet_nong, ho_tro_xang_xe, luong_cnkcp_vuot, luong_hoc_viec_pc_luong, luong_phu_nu_hanh_kinh, luong_toi_thieu_cty, ngay_cong_chu_nhat, ngay_cong_phep_le, ngay_cong_trong_gio, pc_cdcs_pccc_atvsv, salary_month, tam_ung, thue_tncn, thue_tncn_nam_2024, tien_boc_vac, tien_con_bu_thai_7_thang, tien_khen_thuong_chuyen_can, tien_luong_30p_an_ca, tien_luong_chu_nhat, tien_luong_san_pham_trong_gio, tien_luong_tang_ca, tien_luong_thuc_nhan_cuoi_ky, tien_phep_le, tien_tang_ca_vuot, tong_cong_tien_luong, tong_cong_tien_luong_san_pham, tong_gio_lam_viec, tong_he_so_quy_doi, tong_luong_san_pham_cong_doan, truy_thu_the_bhyt",
    )
    .limit(3)
    .order("created_at", { ascending: false });
}

/** app/api/admin/payroll-export-template/route.ts:245-256 tại commit 55b6e6e */
export function legacyTemplateDataQuery(
  supabase: SupabaseServiceClient,
  columns: string,
  salaryMonth: string | null,
) {
  let query = supabase
    .from("payrolls")
    .select(columns)
    .order("created_at", { ascending: false });

  if (salaryMonth) {
    query = query.eq("salary_month", salaryMonth);
  } else {
    query = query.limit(100);
  }

  return query;
}

/** app/api/admin/payroll/search/route.ts:84-86 tại commit 55b6e6e */
export function legacyPayrollTotalCountQuery(supabase: SupabaseServiceClient) {
  return supabase.from("payrolls").select("*", { count: "exact", head: true });
}

/** app/api/admin/payroll/search/route.ts:94-97 tại commit 55b6e6e */
export function legacyAnyPayrollIdQuery(supabase: SupabaseServiceClient) {
  return supabase.from("payrolls").select("id").limit(1);
}

/** app/api/admin/payroll/search/route.ts:168-204 tại commit 55b6e6e */
export function legacyPayrollSearchQuery(
  supabase: SupabaseServiceClient,
  query: string,
  payrollType: string,
  salaryMonth: string | null,
  limit: number,
) {
  let payrollQuery = supabase
    .from("payrolls")
    .select(
      `
        id,
        employee_id,
        salary_month,
        payroll_type,
        tien_luong_thuc_nhan_cuoi_ky,
        source_file,
        created_at,
        employees(
          employee_id,
          full_name,
          department,
          chuc_vu,
          is_active
        )
      `,
    )
    .not("employees.is_active", "is", null)
    .eq("employees.is_active", true)
    .or(`employee_id.ilike.%${sanitizePostgrestValue(query)}%`)
    .order("created_at", { ascending: false });

  if (payrollType === "t13") {
    payrollQuery = payrollQuery.eq("payroll_type", "t13");
  } else {
    payrollQuery = payrollQuery.or(
      "payroll_type.eq.monthly,payroll_type.is.null",
    );
  }

  if (salaryMonth) {
    payrollQuery = payrollQuery.eq("salary_month", salaryMonth);
  }

  return payrollQuery.limit(limit);
}

/** app/api/admin/payroll/search/route.ts:211-217 tại commit 55b6e6e */
export function legacySimplePayrollSearchQuery(
  supabase: SupabaseServiceClient,
  query: string,
  limit: number,
) {
  return supabase
    .from("payrolls")
    .select(
      "id, employee_id, salary_month, tien_luong_thuc_nhan_cuoi_ky, source_file, created_at",
    )
    .ilike("employee_id", `%${sanitizePostgrestValue(query)}%`)
    .limit(limit);
}

/** app/api/admin/payroll/search/route.ts:379-382 tại commit 55b6e6e */
export function legacyAllSalaryMonthsQuery(supabase: SupabaseServiceClient) {
  return supabase
    .from("payrolls")
    .select("salary_month")
    .order("salary_month", { ascending: false });
}

/** app/api/admin/dashboard-stats/route.ts:36-58 tại commit 55b6e6e */
export function legacyRecentPayrollsQuery(
  supabase: SupabaseServiceClient,
  payrollType: string,
) {
  let query = supabase
    .from("payrolls")
    .select(
      `
        id,
        employee_id,
        salary_month,
        payroll_type,
        tien_luong_thuc_nhan_cuoi_ky,
        source_file,
        import_batch_id,
        import_status,
        created_at
      `,
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (payrollType === "t13") {
    query = query.eq("payroll_type", "t13");
  } else {
    query = query.or("payroll_type.eq.monthly,payroll_type.is.null");
  }

  return query;
}

/** app/api/admin/departments/route.ts:107-120 tại commit 55b6e6e */
export function legacyDepartmentsSummaryQuery(
  supabase: SupabaseServiceClient,
  uniqueDepartments: string[],
  salaryMonthFilter: string,
) {
  return supabase
    .from("payrolls")
    .select(
      `
          tien_luong_thuc_nhan_cuoi_ky,
          tong_luong_13,
          is_signed,
          payroll_type,
          salary_month,
          employees!payrolls_employee_id_fkey!inner(department)
        `,
    )
    .in("employees.department", uniqueDepartments)
    .eq("salary_month", salaryMonthFilter);
}

/** app/api/admin/departments/[departmentName]/route.ts:118-209 tại commit 55b6e6e */
export function legacyDepartmentDetailQuery(
  supabase: SupabaseServiceClient,
  departmentName: string,
  salaryMonthFilter: string,
) {
  const payrollQuery = supabase
    .from("payrolls")
    .select(
      `
        id,
        employee_id,
        salary_month,
        payroll_type,
        source_file,
        import_batch_id,
        import_status,
        he_so_lam_viec,
        he_so_phu_cap_ket_qua,
        he_so_luong_co_ban,
        luong_toi_thieu_cty,
        ngay_cong_trong_gio,
        gio_cong_tang_ca,
        gio_an_ca,
        tong_gio_lam_viec,
        tong_he_so_quy_doi,
        ngay_cong_chu_nhat,
        tong_luong_san_pham_cong_doan,
        don_gia_tien_luong_tren_gio,
        tien_luong_san_pham_trong_gio,
        tien_luong_tang_ca,
        tien_luong_30p_an_ca,
        tien_khen_thuong_chuyen_can,
        luong_hoc_viec_pc_luong,
        tong_cong_tien_luong_san_pham,
        ho_tro_thoi_tiet_nong,
        bo_sung_luong,
        pc_luong_cho_viec,
        tien_luong_chu_nhat,
        luong_cnkcp_vuot,
        tien_tang_ca_vuot,
        bhxh_21_5_percent,
        pc_cdcs_pccc_atvsv,
        luong_phu_nu_hanh_kinh,
        tien_con_bu_thai_7_thang,
        ho_tro_gui_con_nha_tre,
        ngay_cong_phep_le,
        tien_phep_le,
        tong_cong_tien_luong,
        tien_boc_vac,
        ho_tro_xang_xe,
        thue_tncn_nam_2024,
        tam_ung,
        thue_tncn,
        bhxh_bhtn_bhyt_total,
        truy_thu_the_bhyt,
        tien_luong_thuc_nhan_cuoi_ky,
        is_signed,
        signed_at,
        signed_by_name,
        signature_ip,
        signature_device,
        created_at,
        updated_at,
        chi_dot_1_13,
        chi_dot_2_13,
        tong_luong_13,
        so_thang_chia_13,
        tong_sp_12_thang,
        t13_thang_01,
        t13_thang_02,
        t13_thang_03,
        t13_thang_04,
        t13_thang_05,
        t13_thang_06,
        t13_thang_07,
        t13_thang_08,
        t13_thang_09,
        t13_thang_10,
        t13_thang_11,
        t13_thang_12,
        employees!payrolls_employee_id_fkey!inner(
          employee_id,
          full_name,
          department,
          chuc_vu
        )
      `,
    )
    .eq("employees.department", departmentName)
    .eq("salary_month", salaryMonthFilter);

  return payrollQuery.order("created_at", { ascending: false });
}

/** app/api/admin/departments/[departmentName]/route.ts:231-261 tại commit 55b6e6e */
export function legacyDepartmentHistoryQuery(
  supabase: SupabaseServiceClient,
  departmentName: string,
  payrollType: string,
  t13Months: string[],
  startMonth: string,
) {
  let historicalQuery = supabase
    .from("payrolls")
    .select(
      `
        salary_month,
        tien_luong_thuc_nhan_cuoi_ky,
        is_signed,
        payroll_type,
        employees!payrolls_employee_id_fkey!inner(department)
      `,
    )
    .eq("employees.department", departmentName);

  if (payrollType === "t13") {
    historicalQuery = historicalQuery.in("salary_month", t13Months);
  } else {
    historicalQuery = historicalQuery
      .gte("salary_month", startMonth)
      .not("salary_month", "like", "%-13");
  }

  return historicalQuery.order("salary_month", { ascending: true });
}

/** app/api/admin/data-validation/route.ts:111-114 tại commit 55b6e6e */
export function legacyPayrollEmployeeIdsQuery(
  supabase: SupabaseServiceClient,
  month: string,
) {
  return supabase
    .from("payrolls")
    .select("employee_id")
    .eq("salary_month", month);
}

/** app/api/employees/all-employees/route.ts:65-68 tại commit 55b6e6e */
export function legacyPayrollSignedFlagsQuery(
  supabase: SupabaseServiceClient,
  month: string,
) {
  return supabase
    .from("payrolls")
    .select("employee_id, is_signed")
    .eq("salary_month", month);
}

/** app/api/employees/all-employees/route.ts:172-178 tại commit 55b6e6e */
export function legacyPayrollSummaryForEmployeesQuery(
  supabase: SupabaseServiceClient,
  month: string,
  employeeIds: string[],
) {
  return supabase
    .from("payrolls")
    .select(
      "employee_id, salary_month, tien_luong_thuc_nhan_cuoi_ky, import_status, created_at",
    )
    .eq("salary_month", month)
    .in("employee_id", employeeIds);
}

/** app/api/admin/employees/[id]/route.ts:377-381 tại commit 55b6e6e */
export function legacyAnyPayrollForEmployeeQuery(
  supabase: SupabaseServiceClient,
  employeeId: string,
) {
  return supabase
    .from("payrolls")
    .select("id")
    .eq("employee_id", employeeId)
    .limit(1);
}
