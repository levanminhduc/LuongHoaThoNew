"use client";

import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Gift, Loader2, Search, XCircle } from "lucide-react";
import {
  useBonusListQuery,
  useBonusPeriodsQuery,
} from "@/lib/hooks/use-bonus-list";
import {
  encodeBonusPeriodKey,
  findBonusPeriodByKey,
  toBonusPeriodComboboxOptions,
} from "@/lib/bonus/bonus-period-key";
import { BonusEmployeeTable } from "@/components/bonus/bonus-employee-table";
import { BonusRowDetailModal } from "@/components/bonus/bonus-row-detail-modal";
import type { BonusListRow } from "@/lib/bonus/bonus-types";
import type { BonusType } from "@/lib/validations/bonus";

interface BonusViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  departments?: string[];
}

interface SelectedPeriod {
  bonusType: BonusType;
  bonusPeriod: string;
}

const ALL_DEPARTMENTS = "all";

function matchesSearch(row: BonusListRow, query: string): boolean {
  const keyword = query.trim().toLowerCase();
  if (!keyword) return true;
  return (
    row.employee_id.toLowerCase().includes(keyword) ||
    row.full_name.toLowerCase().includes(keyword)
  );
}

export function BonusViewModal({
  isOpen,
  onClose,
  departments = [],
}: BonusViewModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState(ALL_DEPARTMENTS);
  const [selectedPeriod, setSelectedPeriod] = useState<SelectedPeriod | null>(
    null,
  );
  const [selectedRow, setSelectedRow] = useState<BonusListRow | null>(null);

  const department =
    selectedDepartment === ALL_DEPARTMENTS ? undefined : selectedDepartment;
  const periodsQuery = useBonusPeriodsQuery(department);
  const listQuery = useBonusListQuery({
    bonusType: selectedPeriod?.bonusType ?? null,
    bonusPeriod: selectedPeriod?.bonusPeriod ?? null,
    department,
  });

  const periods = periodsQuery.data?.periods ?? [];
  const rows = listQuery.data?.rows ?? [];
  const signedCount = listQuery.data?.signedCount ?? 0;
  const visibleRows = useMemo(
    () => rows.filter((row) => matchesSearch(row, searchQuery)),
    [rows, searchQuery],
  );

  const periodOptions = useMemo(
    () => toBonusPeriodComboboxOptions(periods),
    [periods],
  );
  const departmentOptions = useMemo(
    () => [
      { value: ALL_DEPARTMENTS, label: "Tất cả phòng ban" },
      ...[...departments]
        .sort((a, b) =>
          a.localeCompare(b, "vi", { numeric: true, sensitivity: "base" }),
        )
        .map((name) => ({ value: name, label: name })),
    ],
    [departments],
  );

  const handleSelectDepartment = (value: string) => {
    setSelectedDepartment(value || ALL_DEPARTMENTS);
    setSelectedPeriod(null);
  };

  const handleSelectPeriod = (key: string) => {
    const period = findBonusPeriodByKey(periods, key);
    if (!period) return;
    setSelectedPeriod({
      bonusType: period.bonus_type,
      bonusPeriod: period.bonus_period,
    });
  };

  const isEmpty =
    !listQuery.isLoading && !listQuery.isError && visibleRows.length === 0;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-6xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-pink-600" />
              Danh Sách Tiền Thưởng Nhân Viên
            </DialogTitle>
            <DialogDescription>
              {selectedPeriod
                ? `${rows.length} nhân viên • ${signedCount} đã ký nhận`
                : "Chọn đợt thưởng để xem danh sách"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label
                  htmlFor="bonus-view-search"
                  className="text-sm font-medium"
                >
                  Tìm kiếm
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="bonus-view-search"
                    placeholder="Mã NV hoặc tên nhân viên..."
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Phòng ban</label>
                <Combobox
                  aria-label="Lọc theo phòng ban"
                  options={departmentOptions}
                  value={selectedDepartment}
                  onValueChange={handleSelectDepartment}
                  placeholder="Chọn phòng ban"
                  searchPlaceholder="Tìm phòng ban..."
                  emptyText="Không tìm thấy phòng ban."
                  disabled={departments.length === 0}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Đợt thưởng</label>
                <Combobox
                  aria-label="Chọn đợt thưởng"
                  options={periodOptions}
                  value={
                    selectedPeriod
                      ? encodeBonusPeriodKey(
                          selectedPeriod.bonusType,
                          selectedPeriod.bonusPeriod,
                        )
                      : ""
                  }
                  onValueChange={handleSelectPeriod}
                  disabled={periodsQuery.isLoading || periods.length === 0}
                  placeholder={
                    periodsQuery.isLoading ? "Đang tải..." : "Chọn đợt thưởng"
                  }
                  searchPlaceholder="Tìm đợt thưởng..."
                  emptyText="Không tìm thấy đợt thưởng."
                  className="w-full"
                />
              </div>
            </div>

            {listQuery.isLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                <span>Đang tải danh sách tiền thưởng...</span>
              </div>
            )}

            {listQuery.isError && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-red-700">
                    <XCircle className="w-4 h-4" />
                    <span>
                      Không thể tải dữ liệu tiền thưởng. Vui lòng thử lại.
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

            {!listQuery.isLoading &&
              !listQuery.isError &&
              visibleRows.length > 0 && (
                <BonusEmployeeTable
                  rows={visibleRows}
                  onSelectRow={setSelectedRow}
                />
              )}

            {isEmpty && (
              <div className="text-center py-8 text-gray-500">
                <Gift className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium mb-2">
                  {selectedPeriod
                    ? "Không tìm thấy nhân viên"
                    : "Chưa chọn đợt thưởng"}
                </h3>
                <p>
                  {selectedPeriod
                    ? "Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm."
                    : "Chọn một đợt thưởng để xem danh sách nhân viên."}
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {selectedRow && (
        <BonusRowDetailModal
          isOpen
          onClose={() => setSelectedRow(null)}
          row={selectedRow}
        />
      )}
    </>
  );
}
