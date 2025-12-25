import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/server";
import { verifyEmployeeManagementAccess } from "@/lib/auth-middleware";
import { auditService } from "@/lib/audit-service";
import bcrypt from "bcryptjs";

/**
 * @swagger
 * /admin/employees:
 *   get:
 *     tags:
 *       - Admin
 *     summary: Lấy danh sách nhân viên
 *     description: Lấy danh sách nhân viên với phân trang và bộ lọc
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Tìm kiếm theo mã NV, tên, SĐT
 *       - in: query
 *         name: department
 *         schema:
 *           type: string
 *         description: Lọc theo phòng ban
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *         description: Lọc theo chức vụ
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Số trang
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Số bản ghi mỗi trang
 *     responses:
 *       200:
 *         description: Danh sách nhân viên
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 employees:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Employee'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *                 departments:
 *                   type: array
 *                   items:
 *                     type: string
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
export async function GET(request: NextRequest) {
  try {
    const admin = verifyEmployeeManagementAccess(request);
    if (!admin) {
      return NextResponse.json(
        { error: "Không có quyền truy cập" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const department = searchParams.get("department") || "";
    const role = searchParams.get("role") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;

    const supabase = createServiceClient();

    let query = supabase
      .from("employees")
      .select(
        "employee_id, full_name, department, chuc_vu, phone_number, is_active, created_at, updated_at",
        { count: "exact" },
      );

    if (search) {
      query = query.or(
        `employee_id.ilike.%${search}%,full_name.ilike.%${search}%,phone_number.ilike.%${search}%`,
      );
    }

    if (department) {
      query = query.eq("department", department);
    }

    if (role) {
      query = query.eq("chuc_vu", role);
    }

    const {
      data: employees,
      error,
      count,
    } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Error fetching employees:", error);
      return NextResponse.json(
        { error: "Lỗi khi lấy danh sách nhân viên" },
        { status: 500 },
      );
    }

    const { data: departments } = await supabase
      .from("employees")
      .select("department")
      .not("department", "is", null)
      .not("department", "eq", "");

    const uniqueDepartments = [
      ...new Set(departments?.map((d) => d.department) || []),
    ];

    return NextResponse.json({
      employees: employees || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
      departments: uniqueDepartments,
    });
  } catch (error) {
    console.error("Employee GET error:", error);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}

/**
 * @swagger
 * /admin/employees:
 *   post:
 *     tags:
 *       - Admin
 *     summary: Tạo nhân viên mới
 *     description: Tạo nhân viên mới trong hệ thống
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - employee_id
 *               - full_name
 *               - cccd
 *               - chuc_vu
 *             properties:
 *               employee_id:
 *                 type: string
 *                 description: Mã nhân viên
 *               full_name:
 *                 type: string
 *                 description: Họ tên đầy đủ
 *               cccd:
 *                 type: string
 *                 pattern: '^\d{12}$'
 *                 description: Số CCCD 12 chữ số
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 description: Mật khẩu (nếu không có sẽ dùng CCCD)
 *               chuc_vu:
 *                 type: string
 *                 enum: [admin, giam_doc, ke_toan, nguoi_lap_bieu, truong_phong, to_truong, nhan_vien, van_phong]
 *               department:
 *                 type: string
 *               phone_number:
 *                 type: string
 *               is_active:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       200:
 *         description: Tạo nhân viên thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 employee:
 *                   $ref: '#/components/schemas/Employee'
 *                 message:
 *                   type: string
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       409:
 *         description: Mã nhân viên đã tồn tại
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
export async function POST(request: NextRequest) {
  try {
    const admin = verifyEmployeeManagementAccess(request);
    if (!admin) {
      return NextResponse.json(
        { error: "Không có quyền truy cập" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const {
      employee_id,
      full_name,
      cccd,
      password,
      chuc_vu,
      department,
      phone_number,
      is_active = true,
    } = body;

    if (!employee_id || !full_name || !cccd || !chuc_vu) {
      return NextResponse.json(
        { error: "Thiếu thông tin bắt buộc" },
        { status: 400 },
      );
    }

    // Validate CCCD format (12 digits)
    if (!/^\d{12}$/.test(cccd)) {
      return NextResponse.json(
        { error: "CCCD phải có đúng 12 chữ số" },
        { status: 400 },
      );
    }

    // Validate password if provided
    if (password && password.length < 6) {
      return NextResponse.json(
        { error: "Mật khẩu phải có ít nhất 6 ký tự" },
        { status: 400 },
      );
    }

    const validRoles = [
      "admin",
      "giam_doc",
      "ke_toan",
      "nguoi_lap_bieu",
      "truong_phong",
      "to_truong",
      "nhan_vien",
      "van_phong",
    ];
    if (!validRoles.includes(chuc_vu)) {
      return NextResponse.json(
        { error: "Chức vụ không hợp lệ" },
        { status: 400 },
      );
    }

    const restrictedRoles = ["admin", "giam_doc", "ke_toan"];
    if (admin.role === "nguoi_lap_bieu" && restrictedRoles.includes(chuc_vu)) {
      return NextResponse.json(
        { error: "Không có quyền tạo nhân viên với chức vụ này" },
        { status: 403 },
      );
    }

    const supabase = createServiceClient();

    const { data: existing } = await supabase
      .from("employees")
      .select("employee_id")
      .eq("employee_id", employee_id)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "Mã nhân viên đã tồn tại" },
        { status: 409 },
      );
    }

    const cccd_hash = await bcrypt.hash(cccd, 10);
    // If password provided, use it; otherwise use CCCD as default password
    const password_hash = password
      ? await bcrypt.hash(password, 10)
      : cccd_hash;

    const { data: newEmployee, error } = await supabase
      .from("employees")
      .insert({
        employee_id,
        full_name,
        cccd_hash,
        password_hash,
        last_password_change_at: new Date().toISOString(),
        chuc_vu,
        department: department || null,
        phone_number: phone_number || null,
        is_active,
      })
      .select(
        "employee_id, full_name, department, chuc_vu, phone_number, is_active, created_at, updated_at",
      )
      .single();

    if (error) {
      console.error("Error creating employee:", error);

      // Log failed employee creation
      try {
        await auditService.logFailedOperation(
          admin.employee_id,
          admin.full_name || admin.employee_id,
          employee_id,
          "CREATE",
          error.message,
        );
      } catch (auditError) {
        console.error("Audit logging failed:", auditError);
      }

      return NextResponse.json(
        { error: "Lỗi khi tạo nhân viên" },
        { status: 500 },
      );
    }

    // Log successful employee creation
    try {
      await auditService.logEmployeeChange({
        adminUserId: admin.employee_id,
        adminUserName: admin.full_name || admin.employee_id,
        employeeId: newEmployee.employee_id,
        employeeName: newEmployee.full_name,
        actionType: "CREATE",
        changeReason: "New employee created via admin panel",
      });
    } catch (auditError) {
      console.error("Audit logging failed:", auditError);
      // Don't fail the main operation if audit logging fails
    }

    return NextResponse.json({
      success: true,
      employee: newEmployee,
      message: "Tạo nhân viên thành công",
    });
  } catch (error) {
    console.error("Employee POST error:", error);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
