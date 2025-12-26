import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "Hệ thống Quản lý Lương - May Hòa Thọ Điện Bàn",
      version: "1.0.0",
      description:
        "REST API cho hệ thống quản lý lương nhân viên May Hòa Thọ Điện Bàn",
      contact: {
        name: "Admin",
        email: "admin@hoatho.com",
      },
    },
    servers: [
      {
        url: "/api",
        description: "API Server",
      },
    ],
    tags: [
      {
        name: "Admin",
        description: "API quản trị hệ thống",
      },
      {
        name: "Employee",
        description: "API cho nhân viên",
      },
      {
        name: "Payroll",
        description: "API tra cứu lương",
      },
      {
        name: "Debug",
        description: "API debug và testing",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "JWT token từ /api/admin/login",
        },
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "auth_token",
          description: "Cookie auth_token chứa JWT",
        },
      },
      schemas: {
        ErrorResponse: {
          type: "object",
          properties: {
            error: {
              type: "string",
              description: "Thông báo lỗi",
            },
            code: {
              type: "string",
              description: "Mã lỗi",
            },
            details: {
              type: "object",
              description: "Chi tiết lỗi bổ sung",
            },
          },
          required: ["error"],
        },
        SuccessResponse: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              example: true,
            },
            message: {
              type: "string",
            },
            data: {
              type: "object",
            },
          },
        },
        Pagination: {
          type: "object",
          properties: {
            page: {
              type: "integer",
              minimum: 1,
              default: 1,
            },
            pageSize: {
              type: "integer",
              minimum: 1,
              maximum: 100,
              default: 20,
            },
            total: {
              type: "integer",
            },
            totalPages: {
              type: "integer",
            },
          },
        },
        LoginRequest: {
          type: "object",
          properties: {
            username: {
              type: "string",
              description: "Tên đăng nhập (mã nhân viên hoặc admin username)",
            },
            password: {
              type: "string",
              description: "Mật khẩu",
            },
          },
          required: ["username", "password"],
        },
        LoginResponse: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
            },
            token: {
              type: "string",
              description: "JWT token",
            },
            user: {
              type: "object",
              properties: {
                employee_id: {
                  type: "string",
                },
                username: {
                  type: "string",
                },
                role: {
                  type: "string",
                  enum: [
                    "admin",
                    "giam_doc",
                    "ke_toan",
                    "nguoi_lap_bieu",
                    "truong_phong",
                    "to_truong",
                    "van_phong",
                    "nhan_vien",
                  ],
                },
                department: {
                  type: "string",
                },
                allowed_departments: {
                  type: "array",
                  items: {
                    type: "string",
                  },
                },
                permissions: {
                  type: "array",
                  items: {
                    type: "string",
                  },
                },
              },
            },
            message: {
              type: "string",
            },
          },
        },
        Employee: {
          type: "object",
          properties: {
            id: {
              type: "integer",
            },
            employee_id: {
              type: "string",
              description: "Mã nhân viên",
            },
            full_name: {
              type: "string",
              description: "Họ tên đầy đủ",
            },
            department: {
              type: "string",
              description: "Phòng ban",
            },
            chuc_vu: {
              type: "string",
              description: "Chức vụ",
            },
            is_active: {
              type: "boolean",
            },
            created_at: {
              type: "string",
              format: "date-time",
            },
          },
        },
        Payroll: {
          type: "object",
          properties: {
            id: {
              type: "integer",
            },
            employee_id: {
              type: "string",
            },
            salary_month: {
              type: "string",
              description: "Tháng lương (YYYY-MM)",
            },
            payroll_type: {
              type: "string",
              enum: ["normal", "t13"],
            },
            luong_co_ban: {
              type: "number",
            },
            thuc_linh: {
              type: "number",
            },
            is_signed: {
              type: "boolean",
            },
            signed_at: {
              type: "string",
              format: "date-time",
            },
          },
        },
        FileUpload: {
          type: "object",
          properties: {
            file: {
              type: "string",
              format: "binary",
              description: "File Excel (.xlsx, .xls)",
            },
          },
        },
        ImportResult: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
            },
            imported: {
              type: "integer",
              description: "Số bản ghi đã import",
            },
            skipped: {
              type: "integer",
              description: "Số bản ghi bỏ qua",
            },
            errors: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  row: {
                    type: "integer",
                  },
                  message: {
                    type: "string",
                  },
                },
              },
            },
          },
        },
      },
      responses: {
        Unauthorized: {
          description: "Chưa đăng nhập hoặc token hết hạn",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/ErrorResponse",
              },
              example: {
                error: "Unauthorized",
              },
            },
          },
        },
        Forbidden: {
          description: "Không có quyền truy cập",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/ErrorResponse",
              },
              example: {
                error: "Forbidden - Không có quyền truy cập",
              },
            },
          },
        },
        NotFound: {
          description: "Không tìm thấy tài nguyên",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/ErrorResponse",
              },
              example: {
                error: "Not Found",
              },
            },
          },
        },
        BadRequest: {
          description: "Dữ liệu không hợp lệ",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/ErrorResponse",
              },
              example: {
                error: "Bad Request - Dữ liệu không hợp lệ",
              },
            },
          },
        },
        InternalError: {
          description: "Lỗi server",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/ErrorResponse",
              },
              example: {
                error: "Internal Server Error",
              },
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
      {
        cookieAuth: [],
      },
    ],
  },
  apis: ["./app/api/**/*.ts"],
};

let cachedSpec: object | null = null;
let cacheTime: number = 0;
const CACHE_TTL = 60 * 1000;

export function getOpenAPISpec(): object {
  const now = Date.now();
  if (cachedSpec && now - cacheTime < CACHE_TTL) {
    return cachedSpec;
  }

  cachedSpec = swaggerJsdoc(options);
  cacheTime = now;
  return cachedSpec as object;
}

export function clearSpecCache(): void {
  cachedSpec = null;
  cacheTime = 0;
}
