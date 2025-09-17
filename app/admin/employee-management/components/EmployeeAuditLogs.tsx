"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Clock, User, FileText, AlertCircle, CheckCircle, XCircle } from "lucide-react"
import { toast } from "sonner"

interface AuditLog {
  id: string
  audit_timestamp: string
  admin_user_name: string
  action_type: string
  field_name?: string
  old_value?: string
  new_value?: string
  change_reason?: string
  status: 'SUCCESS' | 'FAILED' | 'PARTIAL'
}

interface EmployeeAuditLogsProps {
  employeeId: string
  employeeName: string
}

const actionTypeLabels: Record<string, string> = {
  'CREATE': 'Tạo mới',
  'UPDATE': 'Cập nhật',
  'DELETE': 'Xóa',
  'DEACTIVATE': 'Vô hiệu hóa',
  'ACTIVATE': 'Kích hoạt',
  'PASSWORD_CHANGE': 'Đổi mật khẩu',
  'EMPLOYEE_ID_CHANGE': 'Đổi mã NV',
  'CASCADE_UPDATE': 'Cập nhật liên kết'
}

const fieldLabels: Record<string, string> = {
  'full_name': 'Họ tên',
  'chuc_vu': 'Chức vụ',
  'department': 'Phòng ban',
  'phone_number': 'Số điện thoại',
  'is_active': 'Trạng thái',
  'password': 'Mật khẩu',
  'employee_id': 'Mã nhân viên'
}

const getActionBadgeVariant = (actionType: string) => {
  switch (actionType) {
    case 'CREATE': return 'default'
    case 'UPDATE': return 'secondary'
    case 'DELETE': return 'destructive'
    case 'DEACTIVATE': return 'destructive'
    case 'ACTIVATE': return 'default'
    case 'PASSWORD_CHANGE': return 'outline'
    case 'EMPLOYEE_ID_CHANGE': return 'secondary'
    case 'CASCADE_UPDATE': return 'outline'
    default: return 'secondary'
  }
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'SUCCESS': return <CheckCircle className="h-4 w-4 text-green-500" />
    case 'FAILED': return <XCircle className="h-4 w-4 text-red-500" />
    case 'PARTIAL': return <AlertCircle className="h-4 w-4 text-yellow-500" />
    default: return <AlertCircle className="h-4 w-4 text-gray-500" />
  }
}

export default function EmployeeAuditLogs({ employeeId, employeeName }: EmployeeAuditLogsProps) {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [offset, setOffset] = useState(0)
  const limit = 20

  const fetchAuditLogs = async (reset: boolean = false) => {
    try {
      setLoading(true)
      const currentOffset = reset ? 0 : offset
      
      const token = localStorage.getItem("admin_token")
      if (!token) {
        throw new Error("No admin token found")
      }

      const response = await fetch(
        `/api/admin/employees/${employeeId}/audit-logs?limit=${limit}&offset=${currentOffset}`,
        {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        let errorData: { error?: string } = {}
        try {
          errorData = JSON.parse(errorText)
        } catch (e) {
          errorData = { error: errorText }
        }
        throw new Error(`${response.status}: ${errorData.error || response.statusText}`)
      }

      const data = await response.json()
      
      if (reset) {
        setLogs(data.logs)
        setOffset(data.logs.length)
      } else {
        setLogs(prev => [...prev, ...data.logs])
        setOffset(prev => prev + data.logs.length)
      }
      
      setHasMore(data.pagination.hasMore)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      toast.error(`Lỗi: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAuditLogs(true)
  }, [employeeId])

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const formatValue = (value: string | undefined) => {
    if (!value) return '-'
    if (value === '[HIDDEN]' || value === '[CHANGED]') return value
    if (value === 'true') return 'Có'
    if (value === 'false') return 'Không'
    return value
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Lịch Sử Thay Đổi
        </CardTitle>
        <CardDescription>
          Audit logs cho nhân viên: <strong>{employeeName}</strong> ({employeeId})
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] w-full">
          {logs.length === 0 && !loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Không có lịch sử thay đổi
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log, index) => (
                <div key={log.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(log.status)}
                      <Badge variant={getActionBadgeVariant(log.action_type)}>
                        {actionTypeLabels[log.action_type] || log.action_type}
                      </Badge>
                      {log.field_name && (
                        <span className="text-sm text-muted-foreground">
                          {fieldLabels[log.field_name] || log.field_name}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatTimestamp(log.audit_timestamp)}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                    <User className="h-3 w-3" />
                    <span>Thực hiện bởi: {log.admin_user_name}</span>
                  </div>

                  {log.old_value && log.new_value && (
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-red-600">Giá trị cũ:</span>
                        <div className="bg-red-50 p-2 rounded border">
                          {formatValue(log.old_value)}
                        </div>
                      </div>
                      <div>
                        <span className="font-medium text-green-600">Giá trị mới:</span>
                        <div className="bg-green-50 p-2 rounded border">
                          {formatValue(log.new_value)}
                        </div>
                      </div>
                    </div>
                  )}

                  {log.change_reason && (
                    <div className="mt-2 text-sm">
                      <span className="font-medium">Lý do:</span>
                      <div className="text-muted-foreground italic">
                        {log.change_reason}
                      </div>
                    </div>
                  )}

                  {index < logs.length - 1 && <Separator className="mt-4" />}
                </div>
              ))}
            </div>
          )}

          {hasMore && (
            <div className="text-center mt-4">
              <Button 
                variant="outline" 
                onClick={() => fetchAuditLogs(false)}
                disabled={loading}
              >
                {loading ? "Đang tải..." : "Tải thêm"}
              </Button>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
