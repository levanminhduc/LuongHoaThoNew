"use client"

import { useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  AlertCircle, 
  XCircle, 
  AlertTriangle, 
  Info,
  RefreshCw,
  Home,
  ChevronDown,
  ChevronUp,
  Copy,
  Bug
} from "lucide-react"

interface ErrorAlertProps {
  type?: "error" | "warning" | "info"
  title?: string
  message: string
  details?: string
  onRetry?: () => void
  onDismiss?: () => void
  retryLabel?: string
  showDetails?: boolean
  className?: string
}

export function ErrorAlert({
  type = "error",
  title,
  message,
  details,
  onRetry,
  onDismiss,
  retryLabel = "Thử lại",
  showDetails = false,
  className = ""
}: ErrorAlertProps) {
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false)

  const getAlertConfig = () => {
    switch (type) {
      case "warning":
        return {
          icon: <AlertTriangle className="h-4 w-4" />,
          className: "border-yellow-200 bg-yellow-50",
          iconColor: "text-yellow-600",
          textColor: "text-yellow-800"
        }
      case "info":
        return {
          icon: <Info className="h-4 w-4" />,
          className: "border-blue-200 bg-blue-50",
          iconColor: "text-blue-600",
          textColor: "text-blue-800"
        }
      case "error":
      default:
        return {
          icon: <AlertCircle className="h-4 w-4" />,
          className: "border-red-200 bg-red-50",
          iconColor: "text-red-600",
          textColor: "text-red-800"
        }
    }
  }

  const config = getAlertConfig()

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <Alert className={`${config.className} ${className}`}>
      <div className={config.iconColor}>
        {config.icon}
      </div>
      <AlertDescription className={config.textColor}>
        <div className="space-y-3">
          <div>
            {title && (
              <p className="font-medium mb-1">{title}</p>
            )}
            <p>{message}</p>
          </div>

          {(details || onRetry || onDismiss) && (
            <div className="flex flex-wrap items-center gap-2">
              {onRetry && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRetry}
                  className="h-8"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  {retryLabel}
                </Button>
              )}
              
              {onDismiss && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onDismiss}
                  className="h-8"
                >
                  Đóng
                </Button>
              )}
              
              {details && showDetails && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsDetailsExpanded(!isDetailsExpanded)}
                  className="h-8"
                >
                  {isDetailsExpanded ? (
                    <>
                      <ChevronUp className="h-3 w-3 mr-1" />
                      Ẩn chi tiết
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3 w-3 mr-1" />
                      Xem chi tiết
                    </>
                  )}
                </Button>
              )}
            </div>
          )}

          {details && showDetails && isDetailsExpanded && (
            <div className="mt-3 p-3 bg-white/50 rounded border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium">Chi tiết lỗi:</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(details)}
                  className="h-6 px-2"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
              <pre className="text-xs whitespace-pre-wrap break-words">
                {details}
              </pre>
            </div>
          )}
        </div>
      </AlertDescription>
    </Alert>
  )
}

interface ErrorBoundaryFallbackProps {
  error?: Error
  onRetry?: () => void
  onGoHome?: () => void
  showErrorDetails?: boolean
}

export function ErrorBoundaryFallback({
  error,
  onRetry,
  onGoHome,
  showErrorDetails = false
}: ErrorBoundaryFallbackProps) {
  const [showDetails, setShowDetails] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <XCircle className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-red-800">Có lỗi xảy ra</CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <p className="text-center text-gray-600">
            Ứng dụng gặp lỗi không mong muốn. Vui lòng thử lại hoặc liên hệ hỗ trợ.
          </p>

          {error && showErrorDetails && (
            <div className="space-y-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDetails(!showDetails)}
                className="w-full"
              >
                <Bug className="h-4 w-4 mr-2" />
                {showDetails ? "Ẩn" : "Hiện"} thông tin lỗi
              </Button>
              
              {showDetails && (
                <div className="p-3 bg-gray-100 rounded text-xs">
                  <p className="font-medium mb-2">Error:</p>
                  <pre className="whitespace-pre-wrap break-words">
                    {error.message}
                  </pre>
                  {error.stack && (
                    <>
                      <p className="font-medium mt-3 mb-2">Stack trace:</p>
                      <pre className="whitespace-pre-wrap break-words text-gray-600">
                        {error.stack}
                      </pre>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col gap-2">
            {onRetry && (
              <Button onClick={onRetry} className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Thử lại
              </Button>
            )}
            
            {onGoHome && (
              <Button variant="outline" onClick={onGoHome} className="w-full">
                <Home className="h-4 w-4 mr-2" />
                Về trang chủ
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

interface NetworkErrorProps {
  onRetry?: () => void
  retrying?: boolean
}

export function NetworkError({ onRetry, retrying = false }: NetworkErrorProps) {
  return (
    <ErrorAlert
      type="error"
      title="Lỗi kết nối"
      message="Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng và thử lại."
      onRetry={onRetry}
      retryLabel={retrying ? "Đang thử lại..." : "Thử lại"}
    />
  )
}

interface AuthenticationErrorProps {
  onLogin?: () => void
}

export function AuthenticationError({ onLogin }: AuthenticationErrorProps) {
  return (
    <ErrorAlert
      type="warning"
      title="Phiên đăng nhập hết hạn"
      message="Vui lòng đăng nhập lại để tiếp tục sử dụng."
      onRetry={onLogin}
      retryLabel="Đăng nhập"
    />
  )
}

interface PermissionErrorProps {
  requiredRole?: string
  currentRole?: string
}

export function PermissionError({ requiredRole, currentRole }: PermissionErrorProps) {
  return (
    <ErrorAlert
      type="warning"
      title="Không có quyền truy cập"
      message={
        requiredRole 
          ? `Chức năng này yêu cầu quyền ${requiredRole}. Quyền hiện tại: ${currentRole || 'Không xác định'}.`
          : "Bạn không có quyền truy cập chức năng này."
      }
    />
  )
}

interface ValidationErrorProps {
  errors: string[]
  onDismiss?: () => void
}

export function ValidationError({ errors, onDismiss }: ValidationErrorProps) {
  return (
    <ErrorAlert
      type="warning"
      title="Dữ liệu không hợp lệ"
      message={
        errors.length === 1 
          ? errors[0]
          : `Có ${errors.length} lỗi cần khắc phục:`
      }
      details={errors.length > 1 ? errors.join('\n') : undefined}
      showDetails={errors.length > 1}
      onDismiss={onDismiss}
    />
  )
}

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className = ""
}: EmptyStateProps) {
  return (
    <div className={`text-center py-12 ${className}`}>
      {icon && (
        <div className="mx-auto w-12 h-12 text-gray-400 mb-4">
          {icon}
        </div>
      )}
      
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        {title}
      </h3>
      
      {description && (
        <p className="text-gray-600 mb-6 max-w-sm mx-auto">
          {description}
        </p>
      )}
      
      {action && (
        <Button onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  )
}
