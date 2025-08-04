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
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')

    return `${hours}:${minutes} ${day}/${month}/${year}`
  } catch (error) {
    console.error('Error formatting date:', error)
    return dateString
  }
}

/**
 * Tạo timestamp theo múi giờ Việt Nam (+7)
 * @returns ISO string với timezone Vietnam
 */
export const getVietnamTimestamp = (): string => {
  const now = new Date()
  // Chuyển sang múi giờ Việt Nam (+7)
  const vietnamTime = new Date(now.getTime() + (7 * 60 * 60 * 1000))
  return vietnamTime.toISOString()
}

/**
 * Format date với timezone Vietnam cho display
 * @param dateString - ISO date string
 * @returns Formatted date theo múi giờ Vietnam
 */
export const formatDateVietnam = (dateString: string) => {
  if (!dateString) return ""

  try {
    return new Date(dateString).toLocaleDateString("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
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
