import { z } from "zod";
import { pageQuerySchema } from "./common";

export const AttendancePeriodSchema = z.object({
  period_year: z.coerce
    .number()
    .int()
    .min(2020, { message: "Năm không hợp lệ" })
    .max(2100, { message: "Năm không hợp lệ" }),
  period_month: z.coerce
    .number()
    .int()
    .min(1, { message: "Tháng phải từ 1 đến 12" })
    .max(12, { message: "Tháng phải từ 1 đến 12" }),
});
export type AttendancePeriod = z.infer<typeof AttendancePeriodSchema>;

export const AttendanceEmployeesQuerySchema = pageQuerySchema(50).extend(
  AttendancePeriodSchema.shape,
);
export type AttendanceEmployeesQuery = z.infer<
  typeof AttendanceEmployeesQuerySchema
>;
