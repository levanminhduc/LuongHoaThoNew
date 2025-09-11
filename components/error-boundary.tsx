"use client"

import React, { Component, ErrorInfo, ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { AlertTriangle, RefreshCw, Home } from "lucide-react"

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details for debugging
    console.error("[ErrorBoundary] Application Error:", {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown'
    })

    // Store error info in state for display
    this.setState({ errorInfo })

    // Send error to monitoring service in production
    if (process.env.NODE_ENV === 'production' && typeof window !== 'undefined') {
      // Log basic error info that might help debug mobile issues
      try {
        const errorData = {
          message: error.message,
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          vendor: navigator.vendor,
          language: navigator.language,
          screenSize: `${window.screen.width}x${window.screen.height}`,
          viewport: `${window.innerWidth}x${window.innerHeight}`,
          url: window.location.href,
          timestamp: new Date().toISOString()
        }
        
        // Store in sessionStorage for debugging
        try {
          sessionStorage.setItem('last_error', JSON.stringify(errorData))
        } catch (e) {
          // Ignore storage errors
        }
      } catch (e) {
        // Ignore logging errors
      }
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
    // Reload the page to reset the app state
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }

  private handleGoHome = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/'
    }
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return <>{this.props.fallback}</>
      }

      // Mobile-friendly error page
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-4 sm:p-6">
            <div className="text-center">
              <AlertTriangle className="w-10 h-10 sm:w-12 sm:h-12 text-amber-500 mx-auto mb-3 sm:mb-4" />
              <h2 className="text-lg sm:text-xl font-semibold mb-2">Đã xảy ra lỗi</h2>
              <p className="text-sm sm:text-base text-gray-600 mb-4">
                Rất tiếc, đã có lỗi xảy ra khi tải trang. Vui lòng thử lại.
              </p>
              
              {/* Show error details only in development */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mb-4 text-left">
                  <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                    Chi tiết lỗi (Development)
                  </summary>
                  <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40">
                    {this.state.error.message}
                    {this.state.error.stack && `\n\nStack:\n${this.state.error.stack}`}
                  </pre>
                </details>
              )}

              {/* Action buttons */}
              <div className="space-y-2">
                <Button 
                  onClick={this.handleReset}
                  className="w-full flex items-center justify-center gap-2"
                  size="lg"
                >
                  <RefreshCw className="w-4 h-4" />
                  Tải lại trang
                </Button>
                
                <Button 
                  onClick={this.handleGoHome}
                  variant="outline"
                  className="w-full flex items-center justify-center gap-2"
                  size="lg"
                >
                  <Home className="w-4 h-4" />
                  Về trang chủ
                </Button>
              </div>

              {/* Help text */}
              <p className="mt-4 text-xs text-gray-500">
                Nếu lỗi vẫn tiếp tục, vui lòng liên hệ bộ phận IT để được hỗ trợ.
              </p>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
