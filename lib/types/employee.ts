export interface Employee {
  id: number
  employee_id: string
  full_name: string
  cccd_hash: string
  department: string
  chuc_vu: string
  phone_number?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface EmployeeSearchResult {
  employee_id: string
  full_name: string
  department: string
  chuc_vu: string
  is_active: boolean
}

export interface CCCDUpdateRequest {
  employee_id: string
  new_cccd: string
}

export interface CCCDUpdateResponse {
  success: boolean
  message: string
  employee?: {
    employee_id: string
    full_name: string
  }
  error?: string
}

export interface EmployeeSearchResponse {
  success: boolean
  employees: EmployeeSearchResult[]
  error?: string
}
