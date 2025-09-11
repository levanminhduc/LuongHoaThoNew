"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, XCircle, AlertCircle } from "lucide-react"

export default function BrowserDebugPage() {
  const [browserInfo, setBrowserInfo] = useState<any>(null)
  const [features, setFeatures] = useState<Record<string, boolean>>({})
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      // Collect browser information
      const info = {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        vendor: navigator.vendor || 'Unknown',
        language: navigator.language,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine,
        screenResolution: `${screen.width}x${screen.height}`,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        devicePixelRatio: window.devicePixelRatio || 1,
        touchScreen: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
      }
      setBrowserInfo(info)

      // Check feature support
      const featureChecks = {
        'localStorage': checkLocalStorage(),
        'sessionStorage': checkSessionStorage(),
        'cookies': navigator.cookieEnabled,
        'JavaScript': true,
        'JSON': typeof JSON !== 'undefined',
        'Promises': typeof Promise !== 'undefined',
        'Fetch API': typeof fetch !== 'undefined',
        'Arrow Functions': checkArrowFunctions(),
        'Template Literals': checkTemplateLiterals(),
        'Spread Operator': checkSpreadOperator(),
        'Async/Await': checkAsyncAwait(),
        'Optional Chaining': checkOptionalChaining(),
        'CSS Grid': CSS.supports('display', 'grid'),
        'CSS Flexbox': CSS.supports('display', 'flex'),
      }
      setFeatures(featureChecks)
    } catch (err: any) {
      setError(err.message || 'Failed to collect browser information')
    }
  }, [])

  function checkLocalStorage() {
    try {
      const test = '__test__'
      localStorage.setItem(test, test)
      localStorage.removeItem(test)
      return true
    } catch {
      return false
    }
  }

  function checkSessionStorage() {
    try {
      const test = '__test__'
      sessionStorage.setItem(test, test)
      sessionStorage.removeItem(test)
      return true
    } catch {
      return false
    }
  }

  function checkArrowFunctions() {
    try {
      new Function('() => {}')
      return true
    } catch {
      return false
    }
  }

  function checkTemplateLiterals() {
    try {
      new Function('return `test`')
      return true
    } catch {
      return false
    }
  }

  function checkSpreadOperator() {
    try {
      new Function('return [...[1,2,3]]')
      return true
    } catch {
      return false
    }
  }

  function checkAsyncAwait() {
    try {
      new Function('async function test() { await Promise.resolve() }')
      return true
    } catch {
      return false
    }
  }

  function checkOptionalChaining() {
    try {
      new Function('const obj = {}; return obj?.prop')
      return true
    } catch {
      return false
    }
  }

  const getFeatureIcon = (supported: boolean) => {
    return supported ? (
      <CheckCircle className="w-4 h-4 text-green-500" />
    ) : (
      <XCircle className="w-4 h-4 text-red-500" />
    )
  }

  const getDeviceType = () => {
    if (!browserInfo) return 'Unknown'
    if (browserInfo.touchScreen) {
      if (window.innerWidth < 768) return 'Mobile'
      return 'Tablet'
    }
    return 'Desktop'
  }

  return (
    <div className="min-h-screen p-4 bg-gray-50">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-center mb-6">Browser Compatibility Check</h1>
        
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-700">
                <AlertCircle className="w-5 h-5" />
                Error
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-red-600">{error}</p>
            </CardContent>
          </Card>
        )}

        {browserInfo && (
          <Card>
            <CardHeader>
              <CardTitle>Device Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div><strong>Device Type:</strong> {getDeviceType()}</div>
              <div><strong>Platform:</strong> {browserInfo.platform}</div>
              <div><strong>Language:</strong> {browserInfo.language}</div>
              <div><strong>Screen:</strong> {browserInfo.screenResolution}</div>
              <div><strong>Viewport:</strong> {browserInfo.viewport}</div>
              <div><strong>Touch Screen:</strong> {browserInfo.touchScreen ? 'Yes' : 'No'}</div>
              <div><strong>Online:</strong> {browserInfo.onLine ? 'Yes' : 'No'}</div>
              <div className="break-all"><strong>User Agent:</strong> {browserInfo.userAgent}</div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Feature Support</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.entries(features).map(([feature, supported]) => (
                <div key={feature} className="flex items-center gap-2">
                  {getFeatureIcon(supported)}
                  <span className={supported ? 'text-green-700' : 'text-red-700'}>
                    {feature}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recommendations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {!features.localStorage && (
              <p className="text-amber-600">
                ⚠️ localStorage is not available. Some features may not work properly.
              </p>
            )}
            {!features['Fetch API'] && (
              <p className="text-amber-600">
                ⚠️ Fetch API is not supported. Please update your browser.
              </p>
            )}
            {!features['Optional Chaining'] && (
              <p className="text-amber-600">
                ⚠️ Your browser doesn't support modern JavaScript features. Consider updating.
              </p>
            )}
            {Object.values(features).every(v => v) && (
              <p className="text-green-600">
                ✅ Your browser supports all required features!
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
