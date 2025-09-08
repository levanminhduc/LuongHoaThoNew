# Script kiểm tra quyền của các chức vụ: giam_doc, ke_toan, nguoi_lap_bieu

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "KIỂM TRA QUYỀN CÁC CHỨC VỤ TRONG HỆ THỐNG" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Load environment variables
$env:Path = "C:\Program Files\nodejs;$env:Path"
$projectPath = "D:\HoaThoDienBan\LuongHoaThoNew"
Set-Location $projectPath

# Load .env file
if (Test-Path ".env.local") {
    Get-Content ".env.local" | ForEach-Object {
        if ($_ -match "^([^=]+)=(.*)$") {
            [System.Environment]::SetEnvironmentVariable($matches[1], $matches[2])
        }
    }
}

$supabaseUrl = $env:NEXT_PUBLIC_SUPABASE_URL
$supabaseKey = $env:SUPABASE_SERVICE_KEY

if (-not $supabaseUrl -or -not $supabaseKey) {
    Write-Host "Error: Missing Supabase credentials" -ForegroundColor Red
    exit 1
}

# Extract project ID from URL
$projectId = ($supabaseUrl -replace "https://", "" -replace "\.supabase\.co", "")

Write-Host "Project ID: $projectId" -ForegroundColor Yellow
Write-Host ""

# Function to execute SQL query
function Execute-Query {
    param($query, $description)
    
    Write-Host $description -ForegroundColor Green
    Write-Host "----------------------------------------" -ForegroundColor Gray
    
    $headers = @{
        "apikey" = $supabaseKey
        "Authorization" = "Bearer $supabaseKey"
        "Content-Type" = "application/json"
        "Prefer" = "return=representation"
    }
    
    # Use RPC endpoint for complex queries
    $rpcBody = @{
        query = $query
    } | ConvertTo-Json
    
    try {
        # For simple queries, we'll use the REST API
        # For complex queries, we need to execute them differently
        
        # Let's use a simpler approach - query the tables directly
        if ($query -like "*employees*") {
            $response = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/employees?select=*&is_active=eq.true" -Headers $headers -Method Get
            return $response
        }
        elseif ($query -like "*department_permissions*") {
            $response = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/department_permissions?select=*,employees(full_name,chuc_vu)&is_active=eq.true" -Headers $headers -Method Get
            return $response
        }
        else {
            Write-Host "Query execution not supported via REST API" -ForegroundColor Yellow
            return $null
        }
    }
    catch {
        Write-Host "Error executing query: $_" -ForegroundColor Red
        return $null
    }
}

# 1. Check employees with specific roles
Write-Host "1. KIỂM TRA NHÂN VIÊN VỚI CÁC CHỨC VỤ QUAN TRỌNG" -ForegroundColor Yellow
Write-Host "=================================================" -ForegroundColor Yellow

$headers = @{
    "apikey" = $supabaseKey
    "Authorization" = "Bearer $supabaseKey"
    "Content-Type" = "application/json"
}

# Get employees with specific positions
$positions = @("giam_doc", "ke_toan", "nguoi_lap_bieu", "truong_phong", "to_truong")

foreach ($position in $positions) {
    Write-Host ""
    Write-Host "Chức vụ: $position" -ForegroundColor Cyan
    
    $url = "$supabaseUrl/rest/v1/employees?select=employee_id,full_name,department,chuc_vu&chuc_vu=eq.$position&is_active=eq.true"
    
    try {
        $response = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
        
        if ($response.Count -gt 0) {
            $response | ForEach-Object {
                Write-Host "  - $($_.employee_id): $($_.full_name) - Phòng: $($_.department)" -ForegroundColor White
            }
        }
        else {
            Write-Host "  Không có nhân viên nào với chức vụ này" -ForegroundColor Gray
        }
    }
    catch {
        Write-Host "  Error: $_" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "2. KIỂM TRA QUYỀN TRUY CẬP PHÒNG BAN" -ForegroundColor Yellow
Write-Host "=====================================" -ForegroundColor Yellow

# Get department permissions
$url = "$supabaseUrl/rest/v1/department_permissions?select=*&is_active=eq.true&order=employee_id,department"

try {
    $response = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
    
    if ($response.Count -gt 0) {
        Write-Host ""
        Write-Host "Danh sách quyền truy cập phòng ban đang hoạt động:" -ForegroundColor Green
        
        $groupedPermissions = $response | Group-Object -Property employee_id
        
        foreach ($group in $groupedPermissions) {
            $employeeId = $group.Name
            
            # Get employee details
            $empUrl = "$supabaseUrl/rest/v1/employees?select=full_name,chuc_vu&employee_id=eq.$employeeId&single=true"
            $empDetails = Invoke-RestMethod -Uri $empUrl -Headers $headers -Method Get
            
            Write-Host ""
            Write-Host "  $employeeId - $($empDetails.full_name) ($($empDetails.chuc_vu)):" -ForegroundColor Cyan
            
            foreach ($perm in $group.Group) {
                Write-Host "    + Phòng: $($perm.department)" -ForegroundColor White
                if ($perm.granted_by) {
                    Write-Host "      Cấp bởi: $($perm.granted_by) lúc $($perm.granted_at)" -ForegroundColor Gray
                }
            }
        }
    }
    else {
        Write-Host "  Chưa có quyền truy cập phòng ban nào được cấu hình" -ForegroundColor Yellow
    }
}
catch {
    Write-Host "  Error: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "3. PHÂN TÍCH QUYỀN THEO CHỨC VỤ" -ForegroundColor Yellow
Write-Host "================================" -ForegroundColor Yellow

# Define permissions by role (from auth.ts)
$rolePermissions = @{
    "admin" = @("ALL")
    "giam_doc" = @(
        "VIEW_PAYROLL", 
        "VIEW_EMPLOYEES", 
        "VIEW_REPORTS", 
        "EXPORT_DATA", 
        "VIEW_FINANCIAL", 
        "APPROVE_PAYROLL", 
        "MANAGE_DEPARTMENTS"
    )
    "ke_toan" = @(
        "VIEW_PAYROLL", 
        "VIEW_FINANCIAL", 
        "EXPORT_DATA", 
        "MANAGE_PAYROLL", 
        "VIEW_REPORTS"
    )
    "nguoi_lap_bieu" = @(
        "VIEW_PAYROLL", 
        "VIEW_EMPLOYEES", 
        "VIEW_REPORTS", 
        "EXPORT_DATA", 
        "CREATE_REPORTS"
    )
    "truong_phong" = @(
        "VIEW_PAYROLL", 
        "VIEW_EMPLOYEES", 
        "VIEW_REPORTS", 
        "EXPORT_DATA"
    )
    "to_truong" = @(
        "VIEW_PAYROLL", 
        "VIEW_EMPLOYEES", 
        "VIEW_REPORTS"
    )
    "nhan_vien" = @(
        "VIEW_OWN_PAYROLL"
    )
    "van_phong" = @(
        "VIEW_EMPLOYEES", 
        "MANAGE_EMPLOYEES", 
        "VIEW_REPORTS", 
        "EXPORT_DATA"
    )
}

Write-Host ""
foreach ($role in $rolePermissions.Keys) {
    Write-Host "Chức vụ: $role" -ForegroundColor Cyan
    Write-Host "  Quyền hạn:" -ForegroundColor White
    foreach ($permission in $rolePermissions[$role]) {
        $description = switch ($permission) {
            "ALL" { "Toàn quyền hệ thống" }
            "VIEW_PAYROLL" { "Xem bảng lương" }
            "VIEW_EMPLOYEES" { "Xem danh sách nhân viên" }
            "VIEW_REPORTS" { "Xem báo cáo" }
            "EXPORT_DATA" { "Xuất dữ liệu" }
            "VIEW_FINANCIAL" { "Xem thông tin tài chính" }
            "APPROVE_PAYROLL" { "Phê duyệt bảng lương" }
            "MANAGE_DEPARTMENTS" { "Quản lý phòng ban" }
            "MANAGE_PAYROLL" { "Quản lý bảng lương" }
            "CREATE_REPORTS" { "Tạo báo cáo" }
            "VIEW_OWN_PAYROLL" { "Xem lương cá nhân" }
            "MANAGE_EMPLOYEES" { "Quản lý nhân viên" }
            default { $permission }
        }
        Write-Host "    - $permission : $description" -ForegroundColor Gray
    }
    Write-Host ""
}

Write-Host "4. KIỂM TRA QUYỀN TRUY CẬP PHÒNG BAN THEO CHỨC VỤ" -ForegroundColor Yellow
Write-Host "===================================================" -ForegroundColor Yellow
Write-Host ""

$departmentAccess = @{
    "admin" = "Tất cả phòng ban"
    "giam_doc" = "Tất cả phòng ban"
    "ke_toan" = "Tất cả phòng ban"
    "nguoi_lap_bieu" = "Tất cả phòng ban"
    "van_phong" = "Tất cả phòng ban"
    "truong_phong" = "Các phòng ban được phân quyền (qua bảng department_permissions)"
    "to_truong" = "Chỉ phòng ban của mình"
    "nhan_vien" = "Không có quyền xem phòng ban khác"
}

foreach ($role in $departmentAccess.Keys) {
    Write-Host "$role : $($departmentAccess[$role])" -ForegroundColor White
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "KẾT LUẬN" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Hệ thống phân quyền đã được cấu hình với các chức vụ chính:" -ForegroundColor Green
Write-Host "1. GIÁM ĐỐC (giam_doc): Có quyền xem và phê duyệt tất cả" -ForegroundColor White
Write-Host "2. KẾ TOÁN (ke_toan): Quản lý và xem thông tin tài chính, bảng lương" -ForegroundColor White
Write-Host "3. NGƯỜI LẬP BIỂU (nguoi_lap_bieu): Tạo và xem báo cáo, xuất dữ liệu" -ForegroundColor White
Write-Host ""
Write-Host "Lưu ý: Trưởng phòng cần được cấp quyền cụ thể qua bảng department_permissions" -ForegroundColor Yellow
Write-Host ""
