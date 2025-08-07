export function getCurrentMonth(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

export function getPreviousMonth(): string {
  const now = new Date()
  let year = now.getFullYear()
  let month = now.getMonth()
  
  if (month === 0) {
    month = 12
    year = year - 1
  }
  
  const monthStr = String(month).padStart(2, '0')
  return `${year}-${monthStr}`
}
