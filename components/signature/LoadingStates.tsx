"use client"

import { Loader2, RefreshCw, Clock, CheckCircle, AlertCircle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg"
  className?: string
}

export function LoadingSpinner({ size = "md", className = "" }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6", 
    lg: "h-8 w-8"
  }

  return (
    <Loader2 className={`animate-spin ${sizeClasses[size]} ${className}`} />
  )
}

interface LoadingCardProps {
  title?: string
  description?: string
  showSpinner?: boolean
  className?: string
}

export function LoadingCard({ 
  title = "Đang tải...", 
  description = "Vui lòng đợi trong giây lát",
  showSpinner = true,
  className = ""
}: LoadingCardProps) {
  return (
    <Card className={`${className}`}>
      <CardContent className="flex flex-col items-center justify-center py-12">
        {showSpinner && <LoadingSpinner size="lg" className="mb-4 text-blue-600" />}
        <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-600 text-center">{description}</p>
      </CardContent>
    </Card>
  )
}

interface RefreshButtonProps {
  onRefresh: () => void
  loading?: boolean
  lastUpdated?: string
  disabled?: boolean
  size?: "sm" | "md" | "lg"
  variant?: "default" | "outline" | "ghost"
  className?: string
}

export function RefreshButton({
  onRefresh,
  loading = false,
  lastUpdated,
  disabled = false,
  size = "sm",
  variant = "outline",
  className = ""
}: RefreshButtonProps) {
  return (
    <div className="flex items-center gap-2">
      <Button
        variant={variant}
        size={size}
        onClick={onRefresh}
        disabled={loading || disabled}
        className={className}
      >
        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''} ${size === 'sm' ? 'mr-1' : 'mr-2'}`} />
        {loading ? "Đang cập nhật..." : "Cập nhật"}
      </Button>
      
      {lastUpdated && (
        <span className="text-xs text-gray-500">
          Cập nhật: {lastUpdated}
        </span>
      )}
    </div>
  )
}

interface AutoRefreshIndicatorProps {
  isActive: boolean
  interval: number
  nextRefresh?: number
  onToggle?: () => void
  className?: string
}

export function AutoRefreshIndicator({
  isActive,
  interval,
  nextRefresh,
  onToggle,
  className = ""
}: AutoRefreshIndicatorProps) {
  const formatInterval = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    }
    return `${seconds}s`
  }

  const formatNextRefresh = (ms: number) => {
    const seconds = Math.ceil(ms / 1000)
    return `${seconds}s`
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex items-center gap-1">
        {isActive ? (
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs text-green-700">Tự động cập nhật</span>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 bg-gray-400 rounded-full" />
            <span className="text-xs text-gray-500">Đã tắt</span>
          </div>
        )}
      </div>
      
      <Badge variant="outline" className="text-xs">
        Mỗi {formatInterval(interval)}
      </Badge>
      
      {isActive && nextRefresh && nextRefresh > 0 && (
        <span className="text-xs text-gray-500">
          Tiếp theo: {formatNextRefresh(nextRefresh)}
        </span>
      )}
      
      {onToggle && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className="h-6 px-2 text-xs"
        >
          {isActive ? "Tắt" : "Bật"}
        </Button>
      )}
    </div>
  )
}

interface ProgressIndicatorProps {
  current: number
  total: number
  label?: string
  showPercentage?: boolean
  color?: "blue" | "green" | "yellow" | "red"
  size?: "sm" | "md" | "lg"
  className?: string
}

export function ProgressIndicator({
  current,
  total,
  label,
  showPercentage = true,
  color = "blue",
  size = "md",
  className = ""
}: ProgressIndicatorProps) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0
  
  const colorClasses = {
    blue: "bg-blue-500",
    green: "bg-green-500", 
    yellow: "bg-yellow-500",
    red: "bg-red-500"
  }
  
  const sizeClasses = {
    sm: "h-1",
    md: "h-2",
    lg: "h-3"
  }

  return (
    <div className={`space-y-1 ${className}`}>
      {(label || showPercentage) && (
        <div className="flex justify-between items-center text-sm">
          {label && <span className="text-gray-700">{label}</span>}
          {showPercentage && (
            <span className="text-gray-600">
              {current}/{total} ({percentage}%)
            </span>
          )}
        </div>
      )}
      
      <div className={`w-full bg-gray-200 rounded-full ${sizeClasses[size]}`}>
        <div
          className={`${sizeClasses[size]} rounded-full transition-all duration-500 ${colorClasses[color]}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

interface StatusIndicatorProps {
  status: "loading" | "success" | "error" | "warning" | "idle"
  message?: string
  showIcon?: boolean
  className?: string
}

export function StatusIndicator({
  status,
  message,
  showIcon = true,
  className = ""
}: StatusIndicatorProps) {
  const getStatusConfig = () => {
    switch (status) {
      case "loading":
        return {
          icon: <Loader2 className="h-4 w-4 animate-spin" />,
          color: "text-blue-600",
          bgColor: "bg-blue-50",
          defaultMessage: "Đang xử lý..."
        }
      case "success":
        return {
          icon: <CheckCircle className="h-4 w-4" />,
          color: "text-green-600",
          bgColor: "bg-green-50",
          defaultMessage: "Thành công"
        }
      case "error":
        return {
          icon: <AlertCircle className="h-4 w-4" />,
          color: "text-red-600",
          bgColor: "bg-red-50",
          defaultMessage: "Có lỗi xảy ra"
        }
      case "warning":
        return {
          icon: <AlertCircle className="h-4 w-4" />,
          color: "text-yellow-600",
          bgColor: "bg-yellow-50",
          defaultMessage: "Cảnh báo"
        }
      case "idle":
      default:
        return {
          icon: <Clock className="h-4 w-4" />,
          color: "text-gray-600",
          bgColor: "bg-gray-50",
          defaultMessage: "Sẵn sàng"
        }
    }
  }

  const config = getStatusConfig()

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${config.bgColor} ${className}`}>
      {showIcon && (
        <div className={config.color}>
          {config.icon}
        </div>
      )}
      <span className={`text-sm ${config.color}`}>
        {message || config.defaultMessage}
      </span>
    </div>
  )
}

interface LoadingOverlayProps {
  show: boolean
  message?: string
  className?: string
}

export function LoadingOverlay({
  show,
  message = "Đang xử lý...",
  className = ""
}: LoadingOverlayProps) {
  if (!show) return null

  return (
    <div className={`absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50 ${className}`}>
      <div className="flex flex-col items-center gap-3">
        <LoadingSpinner size="lg" className="text-blue-600" />
        <p className="text-sm text-gray-700">{message}</p>
      </div>
    </div>
  )
}
