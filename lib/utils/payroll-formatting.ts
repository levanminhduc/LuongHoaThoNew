export const formatCurrency = (amount: number) => {
  if (amount === undefined || amount === null) return "0 ₫"
  
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount)
}

export const formatDate = (dateString: string) => {
  if (!dateString) return ""
  
  try {
    return new Date(dateString).toLocaleDateString("vi-VN", {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch (error) {
    console.error('Error formatting date:', error)
    return dateString
  }
}

export const formatDateTime = (dateString: string) => {
  if (!dateString) return ""

  try {
    const date = new Date(dateString)

    // ✅ FIX: Database đã lưu Vietnam time, không cần convert thêm
    const vietnamTime = date.toLocaleString("vi-VN", {
      // Không dùng timeZone để tránh double conversion
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

// NOTE: getVietnamTimestamp function moved to lib/utils/vietnam-timezone.ts
// to avoid conflicts and ensure consistent timezone handling

/**
 * Format date với timezone Vietnam cho display
 * @param dateString - ISO date string
 * @returns Formatted date theo múi giờ Vietnam
 */
export const formatDateVietnam = (dateString: string) => {
  if (!dateString) return ""

  try {
    // ✅ FIX: Database đã lưu Vietnam time, không cần convert thêm
    return new Date(dateString).toLocaleDateString("vi-VN", {
      // Không dùng timeZone để tránh double conversion
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch (error) {
    console.error('Error formatting date:', error)
    return dateString
  }
}
