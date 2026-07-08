import { z } from "zod";
import { SignatureTypeSchema, NotesSchema, DeviceInfoSchema } from "./common";

export const BONUS_TYPES = [
  "thuong_le",
  "thuong_quy",
  "thuong_nong",
  "khac",
] as const;

export const BONUS_TYPE_LABELS: Record<(typeof BONUS_TYPES)[number], string> = {
  thuong_le: "Thưởng Lễ",
  thuong_quy: "Thưởng Quý",
  thuong_nong: "Thưởng Nóng",
  khac: "Khác",
};

export const BONUS_PERIOD_REGEX = /^\d{4}-[A-Z0-9]{1,10}$/;

export const EMPLOYEE_ID_COLUMN_CANDIDATES = [
  "Mã Nhân Viên",
  "Ma Nhan Vien",
  "employee_id",
  "Mã NV",
  "MSNV",
] as const;

export const AMOUNT_COLUMN_CANDIDATES = [
  "Số Tiền Thưởng",
  "Tiền Thưởng",
  "Thành Tiền",
  "amount",
  "Số Tiền",
  "Tổng Thưởng",
  "Tổng Cộng",
] as const;

export const MAX_IMPORT_ERRORS_RETURNED = 100;

export const BonusTypeSchema = z.enum(BONUS_TYPES, {
  message: "Loại thưởng không hợp lệ",
});

const BONUS_PERIOD_MIN_YEAR = 2020;

export const BonusPeriodSchema = z
  .string()
  .trim()
  .toUpperCase()
  .refine((value) => BONUS_PERIOD_REGEX.test(value), {
    message: "Kỳ thưởng không hợp lệ (định dạng YYYY-Mã, ví dụ 2026-Q2)",
  })
  .refine(
    (value) => {
      const year = Number(value.slice(0, 4));
      return (
        year >= BONUS_PERIOD_MIN_YEAR && year <= new Date().getFullYear() + 1
      );
    },
    {
      message: `Năm trong kỳ thưởng phải từ ${BONUS_PERIOD_MIN_YEAR} đến năm sau`,
    },
  );

export const BonusTitleSchema = z
  .string()
  .trim()
  .min(1, { message: "Tiêu đề đợt thưởng không được để trống" })
  .max(150, { message: "Tiêu đề đợt thưởng không được quá 150 ký tự" });

export const BonusImportMetaSchema = z.object({
  bonus_type: BonusTypeSchema,
  bonus_period: BonusPeriodSchema,
  bonus_title: BonusTitleSchema,
  employee_id_column: z
    .string()
    .min(1, { message: "Chưa chọn cột Mã Nhân Viên" }),
  amount_column: z.string().min(1, { message: "Chưa chọn cột Số Tiền Thưởng" }),
});

export const BonusDetailItemSchema = z.object({
  label: z.string(),
  value: z.union([z.number(), z.string()]),
});

export const EmployeeSignBonusRequestSchema = z.object({
  bonus_type: BonusTypeSchema,
  bonus_period: BonusPeriodSchema,
  employee_id: z.string().trim().min(1).max(50).optional(),
  cccd: z.string().trim().min(9).max(20).optional(),
});

export const BonusManagementSignatureRequestSchema = z.object({
  bonus_type: BonusTypeSchema,
  bonus_period: BonusPeriodSchema,
  signature_type: SignatureTypeSchema,
  notes: NotesSchema,
  device_info: DeviceInfoSchema,
});

export type BonusType = z.infer<typeof BonusTypeSchema>;
export type BonusImportMeta = z.infer<typeof BonusImportMetaSchema>;
export type BonusDetailItem = z.infer<typeof BonusDetailItemSchema>;
export type EmployeeSignBonusRequest = z.infer<
  typeof EmployeeSignBonusRequestSchema
>;
export type BonusManagementSignatureRequest = z.infer<
  typeof BonusManagementSignatureRequestSchema
>;
