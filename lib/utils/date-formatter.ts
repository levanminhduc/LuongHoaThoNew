/**
 * Date formatting utilities for Vietnamese locale
 * Based on JavaScript best practices for date manipulation
 */

/**
 * Formats salary month from "YYYY-MM" to Vietnamese format
 * @param salaryMonth - Format: "YYYY-MM" (e.g., "2024-07")
 * @returns Vietnamese formatted month (e.g., "Tháng 7 - 2024" or "07/2024")
 */
export function formatSalaryMonth(salaryMonth: string): string {
  if (!salaryMonth || typeof salaryMonth !== 'string') {
    return salaryMonth || ''
  }

  // Validate format YYYY-MM
  const monthPattern = /^\d{4}-\d{2}$/
  if (!monthPattern.test(salaryMonth)) {
    return salaryMonth // Return original if invalid format
  }

  const [year, month] = salaryMonth.split('-')
  const monthNumber = parseInt(month, 10)
  
  // Validate month range
  if (monthNumber < 1 || monthNumber > 12) {
    return salaryMonth // Return original if invalid month
  }

  // Return Vietnamese format: "Tháng MM - YYYY"
  return `Tháng ${monthNumber} - ${year}`
}

/**
 * Formats salary month to short format MM/YYYY
 * @param salaryMonth - Format: "YYYY-MM" (e.g., "2024-07")
 * @returns Short format (e.g., "07/2024")
 */
export function formatSalaryMonthShort(salaryMonth: string): string {
  if (!salaryMonth || typeof salaryMonth !== 'string') {
    return salaryMonth || ''
  }

  // Validate format YYYY-MM
  const monthPattern = /^\d{4}-\d{2}$/
  if (!monthPattern.test(salaryMonth)) {
    return salaryMonth // Return original if invalid format
  }

  const [year, month] = salaryMonth.split('-')
  
  // Return MM/YYYY format
  return `${month}/${year}`
}

/**
 * Formats date time for Vietnamese locale with Vietnam timezone
 * @param dateString - ISO date string
 * @returns Vietnamese formatted date time in format "HH:MM DD/MM/YYYY"
 */
export function formatDateTime(dateString: string): string {
  if (!dateString) return ''

  try {
    const date = new Date(dateString)

    // Format using Vietnam timezone to ensure consistency
    const vietnamTime = date.toLocaleString("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })

    // Convert from "DD/MM/YYYY, HH:MM" to "HH:MM DD/MM/YYYY"
    const [datePart, timePart] = vietnamTime.split(', ')
    return `${timePart} ${datePart}`
  } catch (error) {
    console.error('Error formatting date:', error)
    return dateString
  }
}

/**
 * Formats signature time for Vietnamese locale (time first format)
 * @param dateString - ISO date string
 * @returns Vietnamese formatted signature time in format "HH:MM DD/MM/YYYY"
 */
export function formatSignatureTime(dateString: string): string {
  if (!dateString) return ''

  try {
    // Ensure display in Vietnam timezone
    return new Date(dateString).toLocaleString("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).replace(/(\d{2})\/(\d{2})\/(\d{4}), (\d{2}):(\d{2})/, '$4:$5 $1/$2/$3')
  } catch (error) {
    console.error('Error formatting signature time:', error)
    return dateString
  }
}

/**
 * Formats currency for Vietnamese locale
 * @param amount - Number amount
 * @returns Vietnamese formatted currency
 */
export function formatCurrency(amount: number): string {
  if (amount === undefined || amount === null) return "0 ₫"

  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount)
}

/**
 * Formats number with 2 decimal places
 * @param value - Number value
 * @returns Formatted number string
 */
export function formatNumber(value: number): string {
  if (value === undefined || value === null) return "0"
  return value.toFixed(2)
}
