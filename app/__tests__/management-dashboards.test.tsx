import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import DirectorDashboard from "@/app/director/dashboard/page";
import AccountantDashboard from "@/app/accountant/dashboard/page";
import ReporterDashboard from "@/app/reporter/dashboard/page";
import { getPreviousMonth } from "@/utils/dateUtils";
import { createTestQueryClient } from "tests/utils/query-wrapper";

jest.mock("@/components/EmployeeListModal", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("@/components/OverviewModal", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("@/components/UnsignedEmployeesModal", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("@/components/EmployeeManagementModal", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("@/lib/toast-utils", () => ({
  showSuccessToast: jest.fn(),
  showErrorToast: jest.fn(),
}));

const dashboardCases = [
  {
    Component: DirectorDashboard,
    title: "Dashboard Giám Đốc",
    countLabel: "Tổng Nhân Viên",
    historyFilters: { limit: 10 },
    signatureType: null,
    signButton: "Ký Xác Nhận Giám Đốc",
  },
  {
    Component: AccountantDashboard,
    title: "Dashboard Kế Toán",
    countLabel: "Tổng Nhân Viên",
    historyFilters: { signature_type: "ke_toan", limit: 10 },
    signatureType: "ke_toan",
    signButton: "Ký Xác Nhận Kế Toán",
  },
  {
    Component: ReporterDashboard,
    title: "Dashboard Người Lập Biểu",
    countLabel: "Tổng Dữ Liệu",
    historyFilters: { signature_type: "nguoi_lap_bieu", limit: 10 },
    signatureType: "nguoi_lap_bieu",
    signButton: "Ký Xác Nhận Báo Cáo",
  },
] as const;

function makeMonthStatus(salaryMonth: string) {
  return {
    month: salaryMonth,
    employee_completion: {
      total_employees: 4,
      signed_employees: 4,
      completion_percentage: 100,
      is_100_percent_complete: true,
      unsigned_employees_sample: [],
    },
    management_signatures: {
      giam_doc: null,
      ke_toan: null,
      nguoi_lap_bieu: null,
    },
    summary: {
      total_signature_types: 3,
      completed_signatures: 0,
      remaining_signatures: ["giam_doc", "ke_toan", "nguoi_lap_bieu"],
      is_fully_signed: false,
      employee_completion_required: true,
    },
  };
}

describe("management dashboard screens", () => {
  it.each(dashboardCases)(
    "loads $title through dashboard query hooks",
    async ({
      Component,
      countLabel,
      historyFilters,
      signButton,
      signatureType,
      title,
    }) => {
      const queryClient = createTestQueryClient();
      const salaryMonth = getPreviousMonth();

      queryClient.setQueryData(
        ["signature-status", salaryMonth],
        makeMonthStatus(salaryMonth),
      );
      queryClient.setQueryData(["signature-history", historyFilters], {
        signatures: [
          {
            id: "sig-1",
            signature_type: signatureType ?? "giam_doc",
            salary_month: salaryMonth,
            signed_by_id: "EMP001",
            signed_by_name: "Người ký",
            department: "Ban giám đốc",
            signed_at: "2026-05-01T02:00:00.000Z",
            notes: "OK",
            is_active: true,
          },
        ],
      });

      render(
        <QueryClientProvider client={queryClient}>
          <Component />
        </QueryClientProvider>,
      );

      expect(
        await screen.findByRole("heading", { name: title }),
      ).toBeInTheDocument();
      expect(await screen.findByText(countLabel)).toBeInTheDocument();
      expect(
        await screen.findByRole("button", { name: new RegExp(signButton) }),
      ).toBeInTheDocument();
    },
  );
});
