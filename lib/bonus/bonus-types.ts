import type { ImportErrorRecord } from "@/lib/import-error-collector";
import type { BonusType, BonusDetailItem } from "@/lib/validations/bonus";
import type { SignatureType } from "@/lib/validations/common";

export interface BonusImportResult {
  success: boolean;
  totalRecords: number;
  successCount: number;
  errorCount: number;
  overwriteCount: number;
  skippedCount: number;
  errors: ImportErrorRecord[];
  batchId: string;
  processingTime: string;
  originalHeaders: string[];
}

export interface BonusPeriodOption {
  bonus_type: BonusType;
  bonus_type_label: string;
  bonus_period: string;
  bonus_title: string | null;
}

export interface BonusPeriodsResponse {
  periods: BonusPeriodOption[];
}

export interface BonusListRow {
  employee_id: string;
  full_name: string;
  department: string | null;
  chuc_vu: string | null;
  bonus_type: BonusType;
  bonus_type_label: string;
  bonus_period: string;
  bonus_title: string | null;
  amount: number;
  detail_data: BonusDetailItem[];
  is_signed: boolean;
  signed_at: string | null;
}

export interface BonusListResponse {
  rows: BonusListRow[];
  totalCount: number;
  signedCount: number;
}

export interface EmployeeBonusItem {
  bonus_type: BonusType;
  bonus_type_label: string;
  bonus_period: string;
  bonus_title: string | null;
  amount: number;
  detail_data: BonusDetailItem[];
  is_signed: boolean;
  signed_at: string | null;
  signed_at_display: string | null;
}

export interface EmployeeBonusesResponse {
  bonuses: EmployeeBonusItem[];
}

export interface SignBonusResponse {
  success: true;
  message: string;
  bonus_type: BonusType;
  bonus_period: string;
  signed_by_name: string;
  signed_at: string;
  signed_at_display: string;
}

export interface BonusSignatureRecord {
  signature_type: SignatureType;
  bonus_type: BonusType;
  bonus_period: string;
  signed_by_id: string;
  signed_by_name: string;
  department: string | null;
  signed_at: string;
  notes: string | null;
}

export interface BonusEmployeeSignProgress {
  total: number;
  signed: number;
  percentage: number;
}

export interface BonusManagementSignatureStatus {
  bonus_type: BonusType;
  bonus_period: string;
  employee_sign_progress: BonusEmployeeSignProgress;
  signatures: Record<SignatureType, BonusSignatureRecord | null>;
}

export interface BonusManagementSignatureSuccess {
  success: true;
  message: string;
  signature: BonusSignatureRecord;
}
