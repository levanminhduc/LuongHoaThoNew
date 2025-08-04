export interface PreviewRecord {
  id: number
  employee_id: string
  salary_month: string
  tien_luong_thuc_nhan_cuoi_ky: number
  source_file: string
  import_batch_id: string
  import_status: string
  created_at: string
  employees: {
    full_name: string
    department: string
  }
}

export interface ImportPreviewSectionProps {
  importBatchId: string
  totalRecords: number
  successCount: number
}

export interface ImportPreviewTableProps {
  data: PreviewRecord[]
  loading: boolean
  error: string
}

export interface PayrollPreviewApiResponse {
  success: boolean
  data: PreviewRecord[]
  total: number
  error?: string
}

export interface UseImportPreviewReturn {
  previewData: PreviewRecord[]
  loading: boolean
  error: string
  loadPreview: (batchId: string) => Promise<void>
}
