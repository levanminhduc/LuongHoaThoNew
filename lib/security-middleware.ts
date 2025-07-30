// Security middleware for rate limiting, CSRF protection, and input validation
import { type NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"

// Rate limiting store (in production, use Redis or database)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

// Rate limiting configuration
const RATE_LIMITS = {
  login: { requests: 5, windowMs: 15 * 60 * 1000 }, // 5 requests per 15 minutes
  api: { requests: 100, windowMs: 60 * 1000 }, // 100 requests per minute
  payroll: { requests: 50, windowMs: 60 * 1000 }, // 50 requests per minute
  admin: { requests: 200, windowMs: 60 * 1000 } // 200 requests per minute for admin
}

// Rate limiting middleware
export function rateLimit(type: keyof typeof RATE_LIMITS) {
  return (request: NextRequest): NextResponse | null => {
    const ip = getClientIP(request)
    const key = `${type}:${ip}`
    const limit = RATE_LIMITS[type]
    const now = Date.now()

    // Get or create rate limit entry
    let entry = rateLimitStore.get(key)
    if (!entry || now > entry.resetTime) {
      entry = { count: 0, resetTime: now + limit.windowMs }
      rateLimitStore.set(key, entry)
    }

    // Check if limit exceeded
    if (entry.count >= limit.requests) {
      return NextResponse.json(
        { 
          error: "Quá nhiều requests. Vui lòng thử lại sau.",
          retryAfter: Math.ceil((entry.resetTime - now) / 1000)
        },
        { 
          status: 429,
          headers: {
            'Retry-After': Math.ceil((entry.resetTime - now) / 1000).toString(),
            'X-RateLimit-Limit': limit.requests.toString(),
            'X-RateLimit-Remaining': Math.max(0, limit.requests - entry.count - 1).toString(),
            'X-RateLimit-Reset': entry.resetTime.toString()
          }
        }
      )
    }

    // Increment counter
    entry.count++
    rateLimitStore.set(key, entry)

    return null // Continue processing
  }
}

// CSRF protection middleware
export function csrfProtection(request: NextRequest): NextResponse | null {
  // Skip CSRF for GET requests
  if (request.method === 'GET') {
    return null
  }

  const origin = request.headers.get('origin')
  const referer = request.headers.get('referer')
  const host = request.headers.get('host')

  // Check if request is from same origin
  const allowedOrigins = [
    `https://${host}`,
    `http://${host}`,
    process.env.NEXT_PUBLIC_APP_URL
  ].filter(Boolean)

  const isValidOrigin = origin && allowedOrigins.includes(origin)
  const isValidReferer = referer && allowedOrigins.some(allowed => referer.startsWith(allowed))

  if (!isValidOrigin && !isValidReferer) {
    return NextResponse.json(
      { error: "CSRF token validation failed" },
      { status: 403 }
    )
  }

  return null // Continue processing
}

// Input validation middleware
export function validateInput(schema: any) {
  return async (request: NextRequest): Promise<NextResponse | null> => {
    try {
      if (request.method === 'GET') {
        return null // Skip validation for GET requests
      }

      const body = await request.json()
      
      // Basic input sanitization
      const sanitizedBody = sanitizeInput(body)
      
      // Validate against schema (you can use Zod or similar)
      if (schema && typeof schema.parse === 'function') {
        schema.parse(sanitizedBody)
      }

      // Store sanitized body for later use
      ;(request as any).validatedBody = sanitizedBody

      return null // Continue processing
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid input data", details: error instanceof Error ? error.message : "Unknown error" },
        { status: 400 }
      )
    }
  }
}

// Input sanitization function
function sanitizeInput(obj: any): any {
  if (typeof obj === 'string') {
    return obj
      .trim()
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeInput)
  }
  
  if (obj && typeof obj === 'object') {
    const sanitized: any = {}
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeInput(value)
    }
    return sanitized
  }
  
  return obj
}

// SQL injection protection
export function preventSQLInjection(input: string): boolean {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
    /(--|\/\*|\*\/|;|'|"|`)/,
    /(\bOR\b|\bAND\b).*?[=<>]/i,
    /\b(WAITFOR|DELAY)\b/i
  ]

  return sqlPatterns.some(pattern => pattern.test(input))
}

// XSS protection
export function preventXSS(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

// Get client IP address
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const cfConnectingIP = request.headers.get('cf-connecting-ip')
  
  if (cfConnectingIP) return cfConnectingIP
  if (forwarded) return forwarded.split(',')[0].trim()
  if (realIP) return realIP
  
  return 'unknown'
}

// Security headers middleware
export function securityHeaders(): NextResponse {
  const response = NextResponse.next()
  
  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  
  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'none'"
  ].join('; ')
  
  response.headers.set('Content-Security-Policy', csp)
  
  return response
}

// Comprehensive security middleware
export function applySecurity(request: NextRequest, options: {
  rateLimit?: keyof typeof RATE_LIMITS
  csrf?: boolean
  validation?: any
}): NextResponse | null {
  // Apply rate limiting
  if (options.rateLimit) {
    const rateLimitResult = rateLimit(options.rateLimit)(request)
    if (rateLimitResult) return rateLimitResult
  }

  // Apply CSRF protection
  if (options.csrf) {
    const csrfResult = csrfProtection(request)
    if (csrfResult) return csrfResult
  }

  // Apply input validation
  if (options.validation) {
    // Note: This would need to be async in real implementation
    // For now, we'll handle validation in individual endpoints
  }

  return null // Continue processing
}

// Audit logging for security events
export async function logSecurityEvent(
  event: string,
  details: any,
  request: NextRequest,
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM'
) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event,
    severity,
    ip: getClientIP(request),
    userAgent: request.headers.get('user-agent'),
    url: request.url,
    method: request.method,
    details
  }

  // In production, send to logging service
  console.warn(`[SECURITY ${severity}]`, logEntry)

  // For critical events, you might want to send alerts
  if (severity === 'CRITICAL') {
    // Send alert to security team
    console.error(`CRITICAL SECURITY EVENT:`, logEntry)
  }
}

// Cleanup rate limit store periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key)
    }
  }
}, 60 * 1000) // Cleanup every minute
