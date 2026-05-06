import { createElement, useEffect, useRef } from "react";
import { render, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "tests/mocks/enable-msw";
import { QueryWrapper } from "tests/utils/query-wrapper";
import {
  useDashboardStatsQuery,
  useManagementSignatureMutation,
} from "../use-dashboard";

jest.mock("@/lib/toast-utils", () => ({
  showSuccessToast: jest.fn(),
  showErrorToast: jest.fn(),
}));

describe("use-dashboard hooks", () => {
  it("fetches dashboard stats with payroll type", async () => {
    let requestUrl = "";
    const onSuccess = jest.fn();
    server.use(
      http.get("*/api/admin/dashboard-stats", ({ request }) => {
        requestUrl = request.url;
        return HttpResponse.json({
          success: true,
          payrolls: [],
          stats: {
            totalRecords: 0,
            totalEmployees: 0,
            totalSalary: 0,
            currentMonth: "2026-04",
            lastImportBatch: "",
            signatureRate: 0,
          },
        });
      }),
    );

    function Probe() {
      const query = useDashboardStatsQuery({ payroll_type: "t13" });

      useEffect(() => {
        if (query.isSuccess) {
          onSuccess();
        }
      }, [query.isSuccess]);

      return null;
    }

    render(createElement(QueryWrapper, null, createElement(Probe)));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());

    expect(new URL(requestUrl).searchParams.get("payroll_type")).toBe("t13");
  });

  it("posts management signature body unchanged", async () => {
    let body: unknown;
    const onDone = jest.fn();
    server.use(
      http.post("*/api/management-signature", async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ success: true });
      }),
    );

    function Probe() {
      const mutation = useManagementSignatureMutation();
      const didRun = useRef(false);

      useEffect(() => {
        if (didRun.current) return;
        didRun.current = true;

        mutation
          .mutateAsync({
            salary_month: "2026-04",
            signature_type: "ke_toan",
            notes: "OK",
            device_info: "test",
            is_t13: false,
          })
          .then(onDone);
      }, [mutation]);

      return null;
    }

    render(createElement(QueryWrapper, null, createElement(Probe)));

    await waitFor(() => expect(onDone).toHaveBeenCalled());

    expect(body).toMatchObject({
      salary_month: "2026-04",
      signature_type: "ke_toan",
      notes: "OK",
      device_info: "test",
      is_t13: false,
    });
  });
});
