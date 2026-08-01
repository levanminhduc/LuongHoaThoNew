import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/server";
import {
  renderErrorHtml,
  renderLookupResultHtml,
} from "@/lib/employee/lookup-html";
import type {
  LookupPayrollResponse,
  LookupResponseFormat,
} from "@/lib/employee/lookup-types";
import { lookupEmployeePayroll } from "@/lib/employee/lookup-service";
import {
  EmployeeLookupRequestSchema,
  parseSchemaOrThrow,
} from "@/lib/validations";
import { csrfProtection, rateLimit } from "@/lib/security-middleware";
import { CACHE_HEADERS } from "@/lib/utils/cache-headers";

function getLookupResponseFormat(request: NextRequest): LookupResponseFormat {
  const contentType = request.headers.get("content-type") || "";
  return contentType.includes("application/json") ? "json" : "html";
}

async function getLookupInput(request: NextRequest) {
  const responseFormat = getLookupResponseFormat(request);
  const rawInput =
    responseFormat === "json"
      ? await request.json()
      : Object.fromEntries(await request.formData());
  const parsed = parseSchemaOrThrow(EmployeeLookupRequestSchema, rawInput);
  return {
    responseFormat,
    employee_id: parsed.employee_id.trim().toUpperCase(),
    cccd: parsed.cccd.trim(),
    is_t13: parsed.is_t13,
  };
}

function createHtmlResponse(body: string, status = 200) {
  return new NextResponse(body, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function createLookupErrorResponse(
  error: string,
  status: number,
  responseFormat: LookupResponseFormat,
  employeeId = "",
) {
  if (responseFormat === "html") {
    return createHtmlResponse(renderErrorHtml(error, employeeId), status);
  }
  return NextResponse.json(
    { error },
    { status, headers: CACHE_HEADERS.sensitive },
  );
}

function createLookupSuccessResponse(
  payroll: LookupPayrollResponse,
  session_token: string,
  responseFormat: LookupResponseFormat,
) {
  if (responseFormat === "html") {
    return createHtmlResponse(renderLookupResultHtml(payroll));
  }
  return NextResponse.json(
    { success: true, payroll, session_token },
    { headers: CACHE_HEADERS.sensitive },
  );
}

/**
 * @swagger
 * /employee/lookup:
 *   post:
 *     tags:
 *       - Employee
 *     summary: Tra cứu thông tin lương
 *     description: Nhân viên tra cứu thông tin lương bằng mã NV và mật khẩu/CCCD
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - employee_id
 *               - cccd
 *             properties:
 *               employee_id:
 *                 type: string
 *                 description: Mã nhân viên
 *               cccd:
 *                 type: string
 *                 description: Mật khẩu hoặc số CCCD
 *               is_t13:
 *                 type: boolean
 *                 default: false
 *                 description: Tra cứu lương tháng 13
 *     responses:
 *       200:
 *         description: Thông tin lương
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 payroll:
 *                   $ref: '#/components/schemas/Payroll'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
export async function POST(request: NextRequest) {
  const responseFormat = getLookupResponseFormat(request);

  const rateLimitResult = rateLimit("payroll")(request);
  if (rateLimitResult) {
    if (responseFormat === "html") {
      return createHtmlResponse(
        renderErrorHtml("Bạn tra cứu quá nhiều lần. Vui lòng thử lại sau."),
        429,
      );
    }
    return rateLimitResult;
  }

  const csrfResult = csrfProtection(request);
  if (csrfResult) {
    if (responseFormat === "html") {
      return createHtmlResponse(
        renderErrorHtml("Yêu cầu không hợp lệ. Vui lòng tra cứu lại."),
        403,
      );
    }
    return csrfResult;
  }

  let employee_id = "";
  let cccd = "";
  let is_t13 = false;

  try {
    const input = await getLookupInput(request);
    employee_id = input.employee_id;
    cccd = input.cccd;
    is_t13 = input.is_t13;
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Dữ liệu không hợp lệ";
    return createLookupErrorResponse(message, 400, responseFormat, employee_id);
  }

  try {
    const result = await lookupEmployeePayroll(createServiceClient(), {
      employee_id,
      cccd,
      is_t13,
    });

    if (!result.ok) {
      return createLookupErrorResponse(
        result.error,
        result.status,
        responseFormat,
        employee_id,
      );
    }

    return createLookupSuccessResponse(
      result.payroll,
      result.session_token,
      responseFormat,
    );
  } catch (error) {
    console.error("Employee lookup error:", error);
    return createLookupErrorResponse(
      "Có lỗi xảy ra khi tra cứu thông tin",
      500,
      responseFormat,
      employee_id,
    );
  }
}
