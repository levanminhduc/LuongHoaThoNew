"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  ArrowLeft, 
  Search, 
  Filter, 
  Trash2, 
  Plus,
  AlertCircle,
  CheckCircle,
  XCircle,
  Calendar,
  User,
  Building2
} from "lucide-react"

interface DepartmentPermission {
  id: number
  employee_id: string
  department: string
  granted_by: string
  granted_at: string
  is_active: boolean
  notes?: string
  employees?: {
    employee_id: string
    full_name: string
    department: string
    chuc_vu: string
  }
  granted_by_employee?: {
    employee_id: string
    full_name: string
  }
}

// Loading component cho Suspense fallback
function PermissionsLoading() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
          <div className="space-y-4">
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Component chính chứa logic useSearchParams (được wrap trong Suspense)
function PermissionsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const departmentFilter = searchParams.get('department')

  const [permissions, setPermissions] = useState<DepartmentPermission[]>([])
  const [filteredPermissions, setFilteredPermissions] = useState<DepartmentPermission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [departmentFilterState, setDepartmentFilterState] = useState<string>(departmentFilter || "all")

  useEffect(() => {
    checkAuthentication()
    loadPermissions()
  }, [])

  useEffect(() => {
    filterPermissions()
  }, [permissions, searchTerm, statusFilter, departmentFilterState])

  const checkAuthentication = () => {
    const token = localStorage.getItem("admin_token")
    const userStr = localStorage.getItem("user_info")
    
    if (!token || !userStr) {
      router.push("/admin/login")
      return
    }

    try {
      const userData = JSON.parse(userStr)
      if (userData.role !== 'admin') {
        router.push("/admin/dashboard")
        return
      }
    } catch (error) {
      console.error("Error parsing user info:", error)
      router.push("/admin/login")
    }
  }

  const loadPermissions = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem("admin_token")
      
      const response = await fetch('/api/admin/department-permissions', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setPermissions(data.permissions || [])
      } else {
        setError("Không thể tải danh sách permissions")
      }

    } catch (error) {
      console.error("Error loading permissions:", error)
      setError("Có lỗi xảy ra khi tải dữ liệu")
    } finally {
      setLoading(false)
    }
  }

  const filterPermissions = () => {
    let filtered = permissions

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(perm => 
        perm.employee_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        perm.employees?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        perm.department.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter(perm => 
        statusFilter === "active" ? perm.is_active : !perm.is_active
      )
    }

    // Filter by department
    if (departmentFilterState !== "all") {
      filtered = filtered.filter(perm => perm.department === departmentFilterState)
    }

    setFilteredPermissions(filtered)
  }

  const revokePermission = async (permissionId: number) => {
    if (!confirm("Bạn có chắc chắn muốn thu hồi quyền này?")) {
      return
    }

    try {
      const token = localStorage.getItem("admin_token")
      
      const response = await fetch(`/api/admin/department-permissions?id=${permissionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        await loadPermissions() // Reload data
        alert("Thu hồi quyền thành công!")
      } else {
        const errorData = await response.json()
        alert(`Lỗi: ${errorData.error}`)
      }

    } catch (error) {
      console.error("Error revoking permission:", error)
      alert("Có lỗi xảy ra khi thu hồi quyền")
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getUniqueValues = (key: keyof DepartmentPermission) => {
    return [...new Set(permissions.map(p => p[key] as string).filter(Boolean))]
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => router.push("/admin/department-management")}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Quay lại
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Quản Lý Department Permissions</h1>
                <p className="text-sm text-gray-600">
                  Xem và quản lý tất cả quyền truy cập departments
                </p>
              </div>
            </div>
            <Button
              onClick={() => router.push("/admin/department-management/assign-permissions")}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Cấp Quyền Mới
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Bộ Lọc
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Tìm kiếm</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Tìm theo tên, mã NV, department..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Trạng thái</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    <SelectItem value="active">Đang hoạt động</SelectItem>
                    <SelectItem value="inactive">Đã thu hồi</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Department</label>
                <Select value={departmentFilterState} onValueChange={setDepartmentFilterState}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả departments</SelectItem>
                    {getUniqueValues('department').map(dept => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm("")
                    setStatusFilter("all")
                    setDepartmentFilterState("all")
                  }}
                  className="w-full"
                >
                  Xóa bộ lọc
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tổng quyền</p>
                  <p className="text-2xl font-bold">{permissions.length}</p>
                </div>
                <Building2 className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Đang hoạt động</p>
                  <p className="text-2xl font-bold text-green-600">
                    {permissions.filter(p => p.is_active).length}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Đã thu hồi</p>
                  <p className="text-2xl font-bold text-red-600">
                    {permissions.filter(p => !p.is_active).length}
                  </p>
                </div>
                <XCircle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Managers có quyền</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {new Set(permissions.filter(p => p.is_active).map(p => p.employee_id)).size}
                  </p>
                </div>
                <User className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Permissions Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              Danh Sách Permissions ({filteredPermissions.length})
            </CardTitle>
            <CardDescription>
              Hiển thị {filteredPermissions.length} trong tổng số {permissions.length} permissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3">Nhân Viên</th>
                    <th className="text-left p-3">Department</th>
                    <th className="text-left p-3">Trạng Thái</th>
                    <th className="text-left p-3">Cấp Bởi</th>
                    <th className="text-left p-3">Ngày Cấp</th>
                    <th className="text-left p-3">Ghi Chú</th>
                    <th className="text-center p-3">Thao Tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPermissions.map((permission) => (
                    <tr key={permission.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        <div>
                          <p className="font-medium">{permission.employees?.full_name || 'N/A'}</p>
                          <p className="text-xs text-muted-foreground">{permission.employee_id}</p>
                          <Badge variant="outline" className="text-xs mt-1">
                            {permission.employees?.chuc_vu || 'N/A'}
                          </Badge>
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge variant="secondary">{permission.department}</Badge>
                      </td>
                      <td className="p-3">
                        <Badge variant={permission.is_active ? "default" : "destructive"}>
                          {permission.is_active ? "Hoạt động" : "Đã thu hồi"}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <div>
                          <p className="text-sm">{permission.granted_by_employee?.full_name || permission.granted_by}</p>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {formatDate(permission.granted_at)}
                        </div>
                      </td>
                      <td className="p-3">
                        <p className="text-xs text-muted-foreground max-w-32 truncate">
                          {permission.notes || '-'}
                        </p>
                      </td>
                      <td className="p-3 text-center">
                        {permission.is_active && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => revokePermission(permission.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredPermissions.length === 0 && (
                <div className="text-center py-12">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Không tìm thấy permissions</h3>
                  <p className="text-muted-foreground mb-4">
                    {permissions.length === 0 
                      ? "Chưa có permissions nào được cấp."
                      : "Không có permissions nào phù hợp với bộ lọc hiện tại."
                    }
                  </p>
                  <Button
                    onClick={() => router.push("/admin/department-management/assign-permissions")}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Cấp Quyền Đầu Tiên
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Export default với Suspense boundary để fix Next.js 15 build error
export default function PermissionsPage() {
  return (
    <Suspense fallback={<PermissionsLoading />}>
      <PermissionsContent />
    </Suspense>
  )
}
