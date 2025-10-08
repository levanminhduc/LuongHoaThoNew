import { createServiceClient } from "@/utils/supabase/server";

export interface EmployeeCompletion {
  total_employees: number;
  signed_employees: number;
  completion_percentage: number;
  is_100_percent_complete: boolean;
  unsigned_employees_sample: Employee[];
}

export interface Employee {
  employee_id: string;
  full_name: string;
  department: string;
  chuc_vu: string;
}

export interface SignatureRecord {
  id: string;
  signature_type: "giam_doc" | "ke_toan" | "nguoi_lap_bieu";
  salary_month: string;
  signed_by_id: string;
  signed_by_name: string;
  department: string;
  signed_at: string;
  ip_address?: string;
  device_info?: string;
  notes?: string;
  is_active: boolean;
}

export interface MonthStatus {
  month: string;
  employee_completion: EmployeeCompletion;
  management_signatures: {
    giam_doc: SignatureRecord | null;
    ke_toan: SignatureRecord | null;
    nguoi_lap_bieu: SignatureRecord | null;
  };
  summary: {
    total_signature_types: 3;
    completed_signatures: number;
    remaining_signatures: string[];
    is_fully_signed: boolean;
    employee_completion_required: boolean;
  };
}

export interface SignatureEligibility {
  is_eligible: boolean;
  reason: string;
  employee_completion?: EmployeeCompletion;
  existing_signature?: SignatureRecord;
}

export async function calculateEmployeeCompletion(
  month: string,
): Promise<EmployeeCompletion> {
  const supabase = createServiceClient();

  // Thay đổi logic: Lấy nhân viên có bảng lương trong tháng đó thay vì tất cả active employees
  const { data: employeesWithPayroll, error: payrollError } = await supabase
    .from("payrolls")
    .select("employee_id")
    .eq("salary_month", month);

  if (payrollError) {
    throw new Error(
      `Error fetching employees with payroll: ${payrollError.message}`,
    );
  }

  const { data: signedEmployees, error: signedError } = await supabase
    .from("signature_logs")
    .select("employee_id")
    .eq("salary_month", month);

  if (signedError) {
    throw new Error(`Error fetching signed employees: ${signedError.message}`);
  }

  // Tính toán dựa trên nhân viên có bảng lương, không phải tất cả active employees
  const totalCount = employeesWithPayroll?.length || 0;
  const signedCount = signedEmployees?.length || 0;
  const completionPercentage =
    totalCount > 0
      ? Math.round((signedCount / totalCount) * 100 * 100) / 100
      : 0;
  const is100PercentComplete = signedCount === totalCount && totalCount > 0;

  const signedEmployeeIds = signedEmployees?.map((s) => s.employee_id) || [];
  const employeesWithPayrollIds =
    employeesWithPayroll?.map((p) => p.employee_id) || [];

  // Lấy sample nhân viên chưa ký trong số những người có bảng lương
  const { data: unsignedSample, error: unsignedError } = await supabase
    .from("employees")
    .select("employee_id, full_name, department, chuc_vu")
    .eq("is_active", true)
    .in("employee_id", employeesWithPayrollIds)
    .not(
      "employee_id",
      "in",
      `(${signedEmployeeIds.length > 0 ? signedEmployeeIds.map((id) => `'${id}'`).join(",") : "''"})`,
    )
    .limit(10);

  if (unsignedError) {
    console.error("Error fetching unsigned employees:", unsignedError);
  }

  return {
    total_employees: totalCount,
    signed_employees: signedCount,
    completion_percentage: completionPercentage,
    is_100_percent_complete: is100PercentComplete,
    unsigned_employees_sample: unsignedSample || [],
  };
}

export async function checkSignatureEligibility(
  month: string,
  signatureType: "giam_doc" | "ke_toan" | "nguoi_lap_bieu",
  employeeId: string,
): Promise<SignatureEligibility> {
  if (!["giam_doc", "ke_toan", "nguoi_lap_bieu"].includes(signatureType)) {
    return {
      is_eligible: false,
      reason: "Invalid signature type",
    };
  }

  const supabase = createServiceClient();

  const { data: employee, error: empError } = await supabase
    .from("employees")
    .select("employee_id, full_name, department, chuc_vu")
    .eq("employee_id", employeeId)
    .eq("is_active", true)
    .single();

  if (empError || !employee) {
    return {
      is_eligible: false,
      reason: "Employee not found or inactive",
    };
  }

  if (employee.chuc_vu !== signatureType) {
    return {
      is_eligible: false,
      reason: "Employee role does not match signature type",
    };
  }

  try {
    const employeeCompletion = await calculateEmployeeCompletion(month);

    if (!employeeCompletion.is_100_percent_complete) {
      return {
        is_eligible: false,
        reason: "Employee signature completion is not 100%",
        employee_completion: employeeCompletion,
      };
    }

    try {
      const { data: existingSignature, error: existingError } = await supabase
        .from("management_signatures")
        .select("*")
        .eq("salary_month", month)
        .eq("signature_type", signatureType)
        .eq("is_active", true)
        .single();

      if (!existingError && existingSignature) {
        return {
          is_eligible: false,
          reason: "Signature already exists for this month and type",
          employee_completion: employeeCompletion,
          existing_signature: existingSignature,
        };
      }
    } catch (error) {
      console.log(
        "Management signatures table not available - proceeding with eligibility check",
      );
    }

    return {
      is_eligible: true,
      reason: "Eligible for signature",
      employee_completion: employeeCompletion,
    };
  } catch (error) {
    return {
      is_eligible: false,
      reason: `Error checking eligibility: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function getManagementSignatureStatus(
  month: string,
): Promise<MonthStatus> {
  try {
    const employeeCompletion = await calculateEmployeeCompletion(month);

    const managementSignatures = {
      giam_doc: null as SignatureRecord | null,
      ke_toan: null as SignatureRecord | null,
      nguoi_lap_bieu: null as SignatureRecord | null,
    };

    try {
      const supabase = createServiceClient();
      const { data: signatures, error: sigError } = await supabase
        .from("management_signatures")
        .select("*")
        .eq("salary_month", month)
        .eq("is_active", true);

      if (!sigError && signatures) {
        signatures.forEach((sig) => {
          managementSignatures[
            sig.signature_type as keyof typeof managementSignatures
          ] = sig;
        });
      }
    } catch (error) {
      console.log(
        "Management signatures table not available - using null values",
      );
    }

    const completedSignatures = Object.values(managementSignatures).filter(
      (sig) => sig !== null,
    ).length;
    const remainingSignatures = [
      "giam_doc",
      "ke_toan",
      "nguoi_lap_bieu",
    ].filter(
      (type) =>
        !managementSignatures[type as keyof typeof managementSignatures],
    );

    return {
      month,
      employee_completion: employeeCompletion,
      management_signatures: managementSignatures,
      summary: {
        total_signature_types: 3,
        completed_signatures: completedSignatures,
        remaining_signatures: remainingSignatures,
        is_fully_signed: completedSignatures === 3,
        employee_completion_required:
          employeeCompletion.is_100_percent_complete,
      },
    };
  } catch (error) {
    throw new Error(
      `Error getting signature status: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export function validateSignatureType(
  signatureType: string,
): signatureType is "giam_doc" | "ke_toan" | "nguoi_lap_bieu" {
  return ["giam_doc", "ke_toan", "nguoi_lap_bieu"].includes(signatureType);
}

export function validateMonthFormat(month: string): boolean {
  return /^\d{4}-\d{2}$/.test(month);
}

export function canUserSignType(
  userRole: string,
  signatureType: string,
): boolean {
  if (userRole === "admin") return true;
  return userRole === signatureType;
}

export function getSignatureTypeDisplayName(signatureType: string): string {
  switch (signatureType) {
    case "giam_doc":
      return "Giám Đốc";
    case "ke_toan":
      return "Kế Toán";
    case "nguoi_lap_bieu":
      return "Người Lập Biểu";
    default:
      return "Unknown";
  }
}

export function getRoleDisplayName(role: string): string {
  switch (role) {
    case "admin":
      return "Quản Trị Viên";
    case "giam_doc":
      return "Giám Đốc";
    case "ke_toan":
      return "Kế Toán";
    case "nguoi_lap_bieu":
      return "Người Lập Biểu";
    case "truong_phong":
      return "Trưởng Phòng";
    case "to_truong":
      return "Tổ Trưởng";
    case "nhan_vien":
      return "Nhân Viên";
    default:
      return "Unknown";
  }
}
