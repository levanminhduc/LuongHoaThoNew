/**
 * Vietnam Timezone Utilities
 * Giải quyết vấn đề timezone mismatch giữa localhost và Vercel deployment
 */

/**
 * Tạo timestamp theo timezone Việt Nam (UTC+7)
 * Sử dụng cho tất cả signature operations để đảm bảo consistency
 *
 * @returns string - Timestamp theo format YYYY-MM-DD HH:mm:ss
 */
export function getVietnamTimestamp(): string {
  return new Date().toLocaleString("sv-SE", {
    timeZone: "Asia/Ho_Chi_Minh"
  })
}

/**
 * Tạo ISO timestamp theo timezone Việt Nam
 *
 * @returns string - ISO timestamp với timezone Việt Nam
 */
export function getVietnamISOTimestamp(): string {
  const vietnamTime = new Date().toLocaleString("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })

  return vietnamTime.replace(', ', 'T')
}

/**
 * Format timestamp để hiển thị cho user Việt Nam
 *
 * @param timestamp - Raw timestamp từ database
 * @returns string - Formatted timestamp (HH:mm DD/MM/YYYY)
 */
export function formatVietnamTimestamp(timestamp: string | Date): string {
  if (!timestamp) return ""

  try {
    const date = new Date(timestamp)

    // ✅ FINAL FIX: Force Vietnam timezone để đảm bảo consistency
    return date.toLocaleString("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",  // Force Vietnam timezone
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).replace(/(\d{2})\/(\d{2})\/(\d{4}), (\d{2}):(\d{2})/, '$4:$5 $1/$2/$3')
  } catch (error) {
    console.error('Error formatting Vietnam timestamp:', error)
    return timestamp.toString()
  }
}

export function formatTimestampFromDBRaw(input: string | Date | null | undefined): string {
  if (!input) return ""
  const s = typeof input === "string" ? input : input instanceof Date ? input.toISOString() : String(input)
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/)
  if (!m) return ""
  const [, y, mo, d, h, mi] = m
  return `${h}:${mi} ${d}/${mo}/${y}`
}


/**
 * Kiểm tra xem timestamp có đúng timezone Việt Nam không
 *
 * @param timestamp - Timestamp cần kiểm tra
 * @returns boolean - True nếu timestamp hợp lệ
 */
export function isValidVietnamTimestamp(timestamp: string): boolean {
  try {
    const date = new Date(timestamp)
    const now = new Date()

    // Kiểm tra timestamp không quá xa so với hiện tại (±1 ngày)
    const diffHours = Math.abs(now.getTime() - date.getTime()) / (1000 * 60 * 60)

    return diffHours <= 24 && !isNaN(date.getTime())
  } catch {
    return false
  }
}

/**
 * Convert UTC timestamp sang Vietnam timezone
 * Sử dụng khi cần convert timestamp từ server UTC
 *
 * @param utcTimestamp - UTC timestamp
 * @returns string - Vietnam timestamp
 */
export function convertUTCToVietnam(utcTimestamp: string | Date): string {
  try {
    const date = new Date(utcTimestamp)

    return date.toLocaleString("sv-SE", {
      timeZone: "Asia/Ho_Chi_Minh"
    })
  } catch (error) {
    console.error('Error converting UTC to Vietnam time:', error)
    return utcTimestamp.toString()
  }
}

/**
 * Tạo debug info cho timezone troubleshooting
 *
 * @returns object - Debug information
 */
export function getTimezoneDebugInfo() {
  const now = new Date()

  return {
    client_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    client_local_time: now.toLocaleString(),
    client_utc_time: now.toISOString(),
    vietnam_time: getVietnamTimestamp(),
    vietnam_iso: getVietnamISOTimestamp(),
    timezone_offset: now.getTimezoneOffset(),
    is_dst: isDaylightSavingTime(now)
  }
}

/**
 * Kiểm tra xem có đang trong thời gian tiết kiệm ánh sáng không
 *
 * @param date - Date object
 * @returns boolean
 */
function isDaylightSavingTime(date: Date): boolean {
  const january = new Date(date.getFullYear(), 0, 1).getTimezoneOffset()
  const july = new Date(date.getFullYear(), 6, 1).getTimezoneOffset()

  return Math.max(january, july) !== date.getTimezoneOffset()
}

/**
 * Constants cho Vietnam timezone
 */
export const VIETNAM_TIMEZONE = {
  name: 'Asia/Ho_Chi_Minh',
  offset: '+07:00',
  offsetHours: 7,
  locale: 'vi-VN'
} as const

/**
 * Format options cho các trường hợp sử dụng khác nhau
 */
export const VIETNAM_FORMAT_OPTIONS = {
  // HH:mm DD/MM/YYYY
  display: {
    year: 'numeric' as const,
    month: '2-digit' as const,
    day: '2-digit' as const,
    hour: '2-digit' as const,
    minute: '2-digit' as const,
    hour12: false,
    timeZone: VIETNAM_TIMEZONE.name
  },

  // YYYY-MM-DD HH:mm:ss (for database)
  database: {
    year: 'numeric' as const,
    month: '2-digit' as const,
    day: '2-digit' as const,
    hour: '2-digit' as const,
    minute: '2-digit' as const,
    second: '2-digit' as const,
    hour12: false,
    timeZone: VIETNAM_TIMEZONE.name
  },

  // DD/MM/YYYY (date only)
  dateOnly: {
    year: 'numeric' as const,
    month: '2-digit' as const,
    day: '2-digit' as const,
    timeZone: VIETNAM_TIMEZONE.name
  },

  // HH:mm (time only)
  timeOnly: {
    hour: '2-digit' as const,
    minute: '2-digit' as const,
    hour12: false,
    timeZone: VIETNAM_TIMEZONE.name
  }
} as const
