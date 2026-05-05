export {
  ROLES,
  SIGNATURE_TYPES,
  IMPORT_STRATEGIES,
  RoleSchema,
  SignatureTypeSchema,
  ImportStrategySchema,
  EmployeeIdSchema,
  SalaryMonthSchema,
  SalaryMonthNormalSchema,
  DepartmentSchema,
  PaginationSchema,
  IsT13Schema,
  NotesSchema,
  DeviceInfoSchema,
  WorkHoursSchema,
  isT13Month,
} from "./common";

export type { Role, SignatureType, ImportStrategy, Pagination } from "./common";

export {
  EmployeeLookupRequestSchema,
  EmployeeSignSalaryRequestSchema,
  EmployeeSalaryHistoryRequestSchema,
  ManagementSignatureRequestSchema,
  BulkSignSalaryRequestSchema,
  SignatureStatusParamsSchema,
  SignatureHistoryQuerySchema,
  EmployeeAccessSchema,
} from "./employee";

export type {
  EmployeeLookupRequest,
  EmployeeSignSalaryRequest,
  EmployeeSalaryHistoryRequest,
  ManagementSignatureRequest,
  BulkSignSalaryRequest,
  SignatureStatusParams,
  SignatureHistoryQuery,
  EmployeeAccess,
} from "./employee";

export {
  PayrollImportRowSchema,
  PayrollImportRequestSchema,
  PayrollQuerySchema,
  DataValidationRequestSchema,
  ImportHistoryCreateSchema,
  BulkPayrollExportRequestSchema,
  PeriodExportRequestSchema,
  DualFilesImportMetaSchema,
} from "./payroll";

export type {
  PayrollImportRow,
  PayrollImportRequest,
  PayrollQuery,
  DataValidationRequest,
  ImportHistoryCreate,
  BulkPayrollExportRequest,
  PeriodExportRequest,
  DualFilesImportMeta,
} from "./payroll";

export {
  zodErrorToApiErrors,
  parseSchema,
  parseSchemaOrThrow,
  createValidationErrorResponse,
} from "./errors";

export type { ValidationResult, ValidationError, ParseResult } from "./errors";

export {
  EmployeeCreateRequestSchema,
  EmployeeUpdateRequestSchema,
  EmployeeListQuerySchema,
  DepartmentPermissionGrantSchema,
  DepartmentPermissionRevokeSchema,
  DepartmentPermissionListQuerySchema,
} from "./admin-employee";

export type {
  EmployeeCreateRequest,
  EmployeeUpdateRequest,
  EmployeeListQuery,
  DepartmentPermissionGrant,
  DepartmentPermissionRevoke,
  DepartmentPermissionListQuery,
} from "./admin-employee";

export {
  AdminLoginRequestSchema,
  ForgotPasswordRequestSchema,
  ChangePasswordWithCccdRequestSchema,
  EmployeeChangePasswordRequestSchema,
} from "./auth";

export type {
  AdminLoginRequest,
  ForgotPasswordRequest,
  ChangePasswordWithCccdRequest,
  EmployeeChangePasswordRequest,
} from "./auth";
