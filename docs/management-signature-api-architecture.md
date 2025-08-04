# 🏗️ **API ARCHITECTURE - MANAGEMENT SIGNATURE SYSTEM**

## 🎯 **OVERVIEW**

API architecture cho hệ thống ký xác nhận lương, được thiết kế dựa trên **existing patterns** trong codebase MAY HÒA THỌ ĐIỆN BÀN để tối ưu development time.

---

## 📡 **API ENDPOINTS DESIGN**

### **Core Signature APIs**

#### **1. GET /api/signature-status/{month}**
```typescript
// Pattern: Follow /api/admin/departments structure
Purpose: "Lấy trạng thái ký của tháng"
Method: GET
Auth: JWT required (giam_doc, ke_toan, nguoi_lap_bieu, admin)
Params: month (YYYY-MM format)

Response: {
  success: boolean
  month: string
  employee_completion: {
    total_employees: number
    signed_employees: number
    completion_percentage: number
    is_100_percent_complete: boolean
    unsigned_employees_sample: Employee[]
  }
  management_signatures: {
    giam_doc: SignatureRecord | null
    ke_toan: SignatureRecord | null
    nguoi_lap_bieu: SignatureRecord | null
  }
  summary: {
    total_signature_types: 3
    completed_signatures: number
    remaining_signatures: string[]
    is_fully_signed: boolean
    employee_completion_required: boolean
  }
}
```

#### **2. POST /api/management-signature**
```typescript
// Pattern: Follow /api/admin/department-permissions structure
Purpose: "Ký xác nhận cho management"
Method: POST
Auth: JWT required + role validation
Body: {
  salary_month: string     // YYYY-MM
  signature_type: string   // giam_doc | ke_toan | nguoi_lap_bieu
  notes?: string          // Optional notes
  device_info?: string    // Browser/device info
}

Response: {
  success: boolean
  signature: SignatureRecord
  message: string
  updated_status: MonthStatus
}
```

#### **3. GET /api/signature-progress/{month}**
```typescript
// Pattern: Follow dashboard API patterns
Purpose: "Real-time progress tracking"
Method: GET
Auth: JWT required
Params: month (YYYY-MM format)

Response: {
  success: boolean
  month: string
  employee_progress: {
    completion_percentage: number
    signed_count: number
    total_count: number
    last_updated: string
  }
  management_progress: {
    completed_types: string[]
    remaining_types: string[]
    completion_percentage: number
  }
  real_time_data: {
    timestamp: string
    next_refresh: string
  }
}
```

#### **4. GET /api/signature-history**
```typescript
// Pattern: Follow existing history APIs
Purpose: "Lịch sử ký xác nhận"
Method: GET
Auth: JWT required
Query: {
  months?: string[]       // Filter by months
  signature_type?: string // Filter by type
  limit?: number         // Pagination
  offset?: number        // Pagination
}

Response: {
  success: boolean
  signatures: SignatureRecord[]
  pagination: {
    total: number
    limit: number
    offset: number
    has_more: boolean
  }
  filters_applied: object
}
```

### **Dashboard APIs**

#### **5. GET /api/director/dashboard**
```typescript
// Pattern: Adapt from /api/admin/dashboard
Purpose: "Dashboard Giám Đốc"
Method: GET
Auth: JWT required (giam_doc role)

Response: {
  success: boolean
  user_info: UserInfo
  signature_status: {
    current_month: MonthStatus
    pending_months: string[]
    signature_history: SignatureRecord[]
  }
  statistics: {
    total_months_signed: number
    completion_rate: number
    average_signing_delay: number
  }
  notifications: Notification[]
}
```

#### **6. GET /api/accountant/dashboard**
```typescript
// Pattern: Adapt from SupervisorDashboard
Purpose: "Dashboard Kế Toán"
Method: GET
Auth: JWT required (ke_toan role)

Response: {
  success: boolean
  user_info: UserInfo
  financial_overview: {
    current_month_status: MonthStatus
    payroll_summary: PayrollSummary
    signature_requirements: SignatureRequirement[]
  }
  signature_history: SignatureRecord[]
  pending_actions: Action[]
}
```

#### **7. GET /api/reporter/dashboard**
```typescript
// Pattern: Adapt from existing dashboard patterns
Purpose: "Dashboard Người Lập Biểu"
Method: GET
Auth: JWT required (nguoi_lap_bieu role)

Response: {
  success: boolean
  user_info: UserInfo
  reporting_status: {
    current_month: MonthStatus
    report_completion: ReportCompletion
    data_accuracy: DataAccuracy
  }
  signature_tracking: SignatureTracking
  monthly_reports: MonthlyReport[]
}
```

---

## 🔐 **AUTHENTICATION & AUTHORIZATION**

### **JWT Token Structure (Extend Existing)**
```typescript
// Reuse existing JWT structure from lib/auth.ts
interface JWTPayload {
  username: string
  employee_id: string
  role: 'admin' | 'giam_doc' | 'ke_toan' | 'nguoi_lap_bieu' | 'truong_phong' | 'to_truong' | 'nhan_vien'
  department: string
  allowed_departments?: string[]
  permissions: string[]
  iat: number
  exp: number
}
```

### **Authorization Matrix**
```typescript
// Extend existing auth-middleware.ts patterns
const API_PERMISSIONS = {
  'GET /api/signature-status/*': ['admin', 'giam_doc', 'ke_toan', 'nguoi_lap_bieu'],
  'POST /api/management-signature': ['admin', 'giam_doc', 'ke_toan', 'nguoi_lap_bieu'],
  'GET /api/signature-progress/*': ['admin', 'giam_doc', 'ke_toan', 'nguoi_lap_bieu'],
  'GET /api/signature-history': ['admin', 'giam_doc', 'ke_toan', 'nguoi_lap_bieu'],
  'GET /api/director/dashboard': ['admin', 'giam_doc'],
  'GET /api/accountant/dashboard': ['admin', 'ke_toan'],
  'GET /api/reporter/dashboard': ['admin', 'nguoi_lap_bieu']
}
```

### **Middleware Integration**
```typescript
// Extend existing verifyToken function
export function verifyManagementSignatureToken(request: NextRequest) {
  const auth = verifyToken(request)
  if (!auth) return null
  
  // Additional validation for management signature roles
  const allowedRoles = ['admin', 'giam_doc', 'ke_toan', 'nguoi_lap_bieu']
  if (!allowedRoles.includes(auth.user.role)) return null
  
  return {
    ...auth,
    canSign: (signatureType: string) => {
      if (auth.user.role === 'admin') return true
      return auth.user.role === signatureType
    }
  }
}
```

---

## 📊 **DATA STRUCTURES**

### **Core Types (Extend Existing)**
```typescript
// Reuse and extend existing types
interface SignatureRecord {
  id: string
  signature_type: 'giam_doc' | 'ke_toan' | 'nguoi_lap_bieu'
  salary_month: string
  signed_by_id: string
  signed_by_name: string
  department: string
  signed_at: string
  ip_address?: string
  device_info?: string
  notes?: string
  is_active: boolean
}

interface EmployeeCompletion {
  total_employees: number
  signed_employees: number
  completion_percentage: number
  is_100_percent_complete: boolean
  unsigned_employees_sample: Employee[]
}

interface MonthStatus {
  month: string
  employee_completion: EmployeeCompletion
  management_signatures: {
    giam_doc: SignatureRecord | null
    ke_toan: SignatureRecord | null
    nguoi_lap_bieu: SignatureRecord | null
  }
  summary: {
    total_signature_types: 3
    completed_signatures: number
    remaining_signatures: string[]
    is_fully_signed: boolean
    employee_completion_required: boolean
  }
}
```

### **API Response Patterns**
```typescript
// Follow existing API response patterns
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
  timestamp: string
}

interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    total: number
    limit: number
    offset: number
    has_more: boolean
  }
}
```

---

## 🔄 **INTEGRATION PATTERNS**

### **Database Integration**
```typescript
// Reuse existing Supabase patterns
import { createServiceClient } from "@/utils/supabase/server"

// Follow existing query patterns from department APIs
const supabase = createServiceClient()
const { data, error } = await supabase
  .from('management_signatures')
  .select('*')
  .eq('salary_month', month)
  .eq('is_active', true)
```

### **Error Handling Patterns**
```typescript
// Reuse existing error handling from admin APIs
try {
  // API logic
  return NextResponse.json({ success: true, data })
} catch (error) {
  console.error("Management signature error:", error)
  return NextResponse.json(
    { error: "Có lỗi xảy ra khi xử lý chữ ký" }, 
    { status: 500 }
  )
}
```

### **Validation Patterns**
```typescript
// Extend existing validation patterns
import { z } from 'zod'

const ManagementSignatureSchema = z.object({
  salary_month: z.string().regex(/^\d{4}-\d{2}$/),
  signature_type: z.enum(['giam_doc', 'ke_toan', 'nguoi_lap_bieu']),
  notes: z.string().optional(),
  device_info: z.string().optional()
})
```

---

## 🚀 **PERFORMANCE OPTIMIZATION**

### **Caching Strategy**
```typescript
// Follow existing caching patterns
const CACHE_KEYS = {
  EMPLOYEE_COMPLETION: (month: string) => `employee_completion:${month}`,
  SIGNATURE_STATUS: (month: string) => `signature_status:${month}`,
  DASHBOARD_DATA: (role: string, month: string) => `dashboard:${role}:${month}`
}

// Cache TTL: 5 minutes for real-time data, 1 hour for historical data
```

### **Database Optimization**
```typescript
// Reuse existing indexing strategies
// Indexes already created in migration script:
// - idx_management_signatures_month_type_active (composite)
// - idx_management_signatures_signed_at (timestamp)
// - idx_management_signatures_signed_by (foreign key)
```

### **Real-time Updates**
```typescript
// Use polling pattern (reuse from existing dashboards)
const POLLING_INTERVALS = {
  SIGNATURE_PROGRESS: 30000,  // 30 seconds
  DASHBOARD_REFRESH: 60000,   // 1 minute
  HISTORY_REFRESH: 300000     // 5 minutes
}
```

---

## 📁 **FILE STRUCTURE**

### **API Routes Structure**
```
app/api/
├── signature-status/
│   └── [month]/route.ts
├── management-signature/
│   └── route.ts
├── signature-progress/
│   └── [month]/route.ts
├── signature-history/
│   └── route.ts
├── director/
│   └── dashboard/route.ts
├── accountant/
│   └── dashboard/route.ts
└── reporter/
    └── dashboard/route.ts
```

### **Shared Utilities**
```
lib/
├── management-signature-utils.ts    # Business logic utilities
├── signature-validation.ts          # Validation schemas
└── signature-types.ts              # TypeScript interfaces
```

---

## 🧪 **TESTING STRATEGY**

### **API Testing Patterns**
```typescript
// Follow existing API testing patterns
describe('Management Signature APIs', () => {
  test('GET /api/signature-status/{month}', async () => {
    // Test with existing test data (GD001, KT001, NLB001)
  })
  
  test('POST /api/management-signature', async () => {
    // Test signature creation with role validation
  })
})
```

### **Integration Testing**
```typescript
// Reuse existing integration test patterns
// Test with existing employee data
// Test role-based access control
// Test business logic validation
```

---

**API Architecture Planning hoàn thành - Ready for Backend Development!** 🚀
