import bcrypt from "bcryptjs"
import { createServiceClient } from "@/utils/supabase/server"

// Hardcoded admin credentials (có thể thay thế bằng Supabase Auth)
const ADMIN_CREDENTIALS = {
  username: "admin",
  password: "admin123",
}

export async function verifyAdminCredentials(username: string, password: string): Promise<boolean> {
  // Sử dụng hardcoded credentials hoặc kiểm tra từ database
  if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
    return true
  }

  // Hoặc kiểm tra từ database
  try {
    const supabase = createServiceClient()
    const { data: admin } = await supabase.from("admin_users").select("password_hash").eq("username", username).single()

    if (admin) {
      return await bcrypt.compare(password, admin.password_hash)
    }
  } catch (error) {
    console.error("Error verifying admin credentials:", error)
  }

  return false
}

export async function verifyEmployeeCredentials(employeeId: string, cccd: string): Promise<any> {
  try {
    const supabase = createServiceClient()
    const { data: employee } = await supabase
      .from("payrolls")
      .select("*")
      .eq("employee_id", employeeId)
      .eq("cccd", cccd)
      .single()

    return employee
  } catch (error) {
    console.error("Error verifying employee credentials:", error)
    return null
  }
}
