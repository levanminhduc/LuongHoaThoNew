# Attendance Export Daily Sheet Layout Plan

## Scope

- File: `app/api/admin/attendance-export/route.ts`
- Target: sheet `Chi Tiết Ngày`
- Out of scope: sheet `Tổng Hợp Tháng`, query logic, workbook/file naming, export payload

## Approved Changes

1. Increase the first row height of `Chi Tiết Ngày` to 4x the current visual height.
2. Apply wrap text to the header cells of these summary columns:
   - `Tổng Ngày Công`
   - `Tổng Giờ Công`
   - `Tổng Giờ Ăn TC`
   - `Tổng Giờ Tăng Ca`
   - `Nghỉ Ốm`
3. Keep the existing auto-fit logic for the sheet, then override only the 6 summary columns above with:
   - `newWidth = max(8, min(9, currentWidth / 2))`
4. Leave `Ký Tên` and `Ngày Ký` unchanged.
5. Preserve existing merges, grouping rows, data mapping, and department row styling.

## Implementation Notes

- Set `dailySheet["!rows"][0]` after sheet creation.
- Reuse `summaryStartCol` to address the summary columns.
- Apply the wrap style only to row `0` for the 5 target columns.
- Override widths after `dailySheet["!cols"]` is assigned from auto-fit.

## Verification

- TypeScript compile check with `npm run typecheck`
- Confirm no change to export structure besides the requested layout updates
