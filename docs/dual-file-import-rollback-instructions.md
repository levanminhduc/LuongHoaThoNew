# 🔄 **DUAL FILE IMPORT FIXES - ROLLBACK INSTRUCTIONS**

## 📋 **OVERVIEW**

Hướng dẫn rollback chi tiết cho tất cả các changes đã implement trong tính năng Dual File Upload với Column Mapping.

## ⚠️ **EMERGENCY ROLLBACK (Quick Fix)**

Nếu cần rollback ngay lập tức:

### **Step 1: Disable New Features**
```bash
# Rename new API route to disable it
mv app/api/admin/import-dual-files/route.ts app/api/admin/import-dual-files/route.ts.backup
```

### **Step 2: Restore Basic Functionality**
```bash
# Create minimal working endpoint
cat > app/api/admin/import-dual-files/route.ts << 'EOF'
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  return NextResponse.json({ 
    error: "Service temporarily unavailable. Please try again later." 
  }, { status: 503 })
}
EOF
```

### **Step 3: Restart Application**
```bash
npm run dev
```

## 🔧 **DETAILED ROLLBACK BY COMPONENT**

### **1. API Route Consolidation Rollback**

#### **What Was Changed:**
- Removed `/api/admin/dual-file-import/route.ts`
- Removed `components/dual-file-import-section.tsx`
- Updated admin dashboard to remove old tab

#### **Rollback Steps:**

**Step 1.1: Restore Old API Route**
```typescript
// Create app/api/admin/dual-file-import/route.ts
import { type NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/utils/supabase/server"
import { DualFileImportParser } from "@/lib/dual-file-import-parser"
import jwt from "jsonwebtoken"

// [Copy original implementation from backup]
```

**Step 1.2: Restore DualFileImportSection Component**
```bash
# Restore from git if available
git checkout HEAD~1 -- components/dual-file-import-section.tsx
```

**Step 1.3: Update Admin Dashboard**
```typescript
// In app/admin/dashboard/admin-dashboard.tsx
// Add back import
import { DualFileImportSection } from "@/components/dual-file-import-section"

// Add back tab trigger
<TabsTrigger value="advanced-import" className="flex items-center gap-2">
  <Database className="h-4 w-4" />
  Dual Import v2
</TabsTrigger>

// Add back tab content
<TabsContent value="advanced-import" className="space-y-6">
  <DualFileImportSection />
</TabsContent>
```

### **2. Duplicate Handling Rollback**

#### **What Was Changed:**
- Added `duplicateStrategy` parameter
- Modified `processFile` function signature
- Added UI selector for duplicate strategy

#### **Rollback Steps:**

**Step 2.1: Remove Duplicate Strategy Parameter**
```typescript
// In app/api/admin/import-dual-files/route.ts
// Remove this line:
// const duplicateStrategy = formData.get("duplicateStrategy") as string || "skip"

// Revert function calls:
const file1Results = await processFile(file1, file1Mappings, supabase, "file1")
const file2Results = await processFile(file2, file2Mappings, supabase, "file2")
```

**Step 2.2: Revert Function Signature**
```typescript
// Remove duplicateStrategy parameter from processFile function
async function processFile(
  file: File, 
  mappings: ColumnMapping[], 
  supabase: any, 
  fileType: string
): Promise<{...}>
```

**Step 2.3: Hardcode Skip Strategy**
```typescript
// In processFile function, replace:
// const duplicateAction = duplicateStrategy
// With:
const duplicateAction = "skip"
```

**Step 2.4: Remove UI Selector**
```typescript
// In components/FileUploadStep.tsx
// Remove duplicate strategy state:
// const [duplicateStrategy, setDuplicateStrategy] = useState<string>("skip")

// Remove from formData:
// formData.append("duplicateStrategy", duplicateStrategy)

// Remove UI selector card (lines with "Cấu Hình Xử Lý Trùng Lặp")
```

### **3. Error Response Standardization Rollback**

#### **What Was Changed:**
- Added `lib/api-error-handler.ts`
- Updated error responses to use standardized format
- Modified client-side error handling

#### **Rollback Steps:**

**Step 3.1: Remove Error Handler**
```bash
rm lib/api-error-handler.ts
```

**Step 3.2: Revert API Error Responses**
```typescript
// In app/api/admin/import-dual-files/route.ts
// Remove import:
// import { ApiErrorHandler, type ApiError, type ApiResponse } from "@/lib/api-error-handler"

// Revert error responses to simple format:
if (!authHeader || !authHeader.startsWith("Bearer ")) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}

// Revert success response:
return NextResponse.json({
  success: true,
  totalRecords,
  successCount,
  errorCount,
  errors: errors.slice(0, 10),
  message: `Successfully processed ${successCount} records`
})
```

**Step 3.3: Revert Client Error Handling**
```typescript
// In components/FileUploadStep.tsx
// Revert to simple error handling:
if (response.ok) {
  setResults(result)
  setMessage(`Đã xử lý thành công! Import ${result.totalRecords || 0} bản ghi.`)
  onComplete?.(result)
} else {
  throw new Error(result.error || "Không thể xử lý files")
}
```

### **4. Transaction Support Rollback**

#### **What Was Changed:**
- Added Supabase transaction function
- Modified API to use transaction
- Added `processFileForTransaction` function

#### **Rollback Steps:**

**Step 4.1: Remove Transaction Function**
```sql
-- Run in Supabase SQL editor
DROP FUNCTION IF EXISTS import_dual_files_transaction(jsonb, jsonb, text);
```

**Step 4.2: Revert API Logic**
```typescript
// In app/api/admin/import-dual-files/route.ts
// Remove transaction-related code and revert to original processFile logic
// Remove processFileForTransaction function
// Revert to individual file processing without transaction
```

### **5. Enhanced Validation Rollback**

#### **What Was Changed:**
- Added `lib/payroll-validation.ts`
- Integrated validation into processing pipeline

#### **Rollback Steps:**

**Step 5.1: Remove Validation Library**
```bash
rm lib/payroll-validation.ts
```

**Step 5.2: Remove Validation Integration**
```typescript
// In app/api/admin/import-dual-files/route.ts
// Remove import:
// import { PayrollValidator, type ValidationResult } from "@/lib/payroll-validation"

// Remove validation code from processFileForTransaction:
// Remove validation result processing
// Remove auto-fixes logic
```

### **6. UI Improvements Rollback**

#### **What Was Changed:**
- Enhanced error display in FileUploadStep
- Added detailed result cards
- Improved user feedback

#### **Rollback Steps:**

**Step 6.1: Revert FileUploadStep UI**
```typescript
// In components/FileUploadStep.tsx
// Revert to simple results display:
{results && (
  <Card className="border-green-200 bg-green-50">
    <CardHeader>
      <CardTitle className="text-sm flex items-center gap-2 text-green-800">
        <CheckCircle className="h-4 w-4" />
        Kết Quả Xử Lý
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <span className="text-green-700">Tổng bản ghi:</span>
          <div className="font-bold text-lg text-green-800">{results.totalRecords || 0}</div>
        </div>
        <div>
          <span className="text-green-700">Thành công:</span>
          <div className="font-bold text-lg text-green-800">{results.successCount || 0}</div>
        </div>
        <div>
          <span className="text-green-700">Lỗi:</span>
          <div className="font-bold text-lg text-red-600">{results.errorCount || 0}</div>
        </div>
        <div>
          <span className="text-green-700">Thời gian:</span>
          <div className="font-bold text-lg text-green-800">{results.processingTime || "N/A"}</div>
        </div>
      </div>
    </CardContent>
  </Card>
)}
```

## 🔄 **COMPLETE ROLLBACK SCRIPT**

```bash
#!/bin/bash
# Complete rollback script

echo "🔄 Starting complete rollback..."

# 1. Remove new files
rm -f lib/api-error-handler.ts
rm -f lib/payroll-validation.ts
rm -f scripts/supabase-setup/10-dual-file-import-transaction.sql
rm -f docs/dual-file-import-fixes-testing.md
rm -f docs/dual-file-import-rollback-instructions.md

# 2. Restore from git (if available)
git checkout HEAD~10 -- app/api/admin/dual-file-import/route.ts
git checkout HEAD~10 -- components/dual-file-import-section.tsx
git checkout HEAD~10 -- app/admin/dashboard/admin-dashboard.tsx
git checkout HEAD~10 -- components/FileUploadStep.tsx

# 3. Remove transaction function from database
echo "DROP FUNCTION IF EXISTS import_dual_files_transaction(jsonb, jsonb, text);" | supabase db reset

# 4. Restart application
npm run dev

echo "✅ Rollback completed. Please test basic functionality."
```

## ⚠️ **POST-ROLLBACK VERIFICATION**

After rollback, verify:

1. **Basic Upload Works**
   - Can upload single file
   - Can upload dual files
   - Basic error handling works

2. **UI Functions**
   - Admin dashboard loads
   - File upload interface works
   - Results display correctly

3. **Database Integrity**
   - No orphaned records
   - No broken constraints
   - Normal insert operations work

## 📞 **SUPPORT CONTACTS**

If rollback issues occur:
- Check application logs: `npm run dev`
- Check database logs in Supabase dashboard
- Verify file permissions and paths
- Test with minimal data first

**Emergency Contact**: System Administrator
**Documentation**: This file and testing guide
**Last Updated**: 2024-01-XX
