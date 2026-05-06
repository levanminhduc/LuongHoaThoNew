import { createElement, useEffect, useRef } from "react";
import { render, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "tests/mocks/enable-msw";
import { QueryWrapper } from "tests/utils/query-wrapper";
import { usePayrollSearchQuery, useSignSalaryMutation } from "../use-payroll";

jest.mock("@/lib/toast-utils", () => ({
  showSuccessToast: jest.fn(),
  showErrorToast: jest.fn(),
}));

describe("use-payroll hooks", () => {
  it("fetches payroll search with salary month and limit params", async () => {
    let requestUrl = "";
    const onSuccess = jest.fn();
    server.use(
      http.get("*/api/admin/payroll/search", ({ request }) => {
        requestUrl = request.url;
        return HttpResponse.json({ success: true, results: [], total: 0 });
      }),
    );

    function Probe() {
      const query = usePayrollSearchQuery({
        q: "NV",
        salary_month: "2026-04",
        payroll_type: "monthly",
        limit: 200,
      });

      useEffect(() => {
        if (query.isSuccess) {
          onSuccess();
        }
      }, [query.isSuccess]);

      return null;
    }

    render(createElement(QueryWrapper, null, createElement(Probe)));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());

    const params = new URL(requestUrl).searchParams;
    expect(params.get("q")).toBe("NV");
    expect(params.get("salary_month")).toBe("2026-04");
    expect(params.get("payroll_type")).toBe("monthly");
    expect(params.get("limit")).toBe("200");
  });

  it("preserves T13 salary_month in sign salary body", async () => {
    let body: unknown;
    const onDone = jest.fn();
    server.use(
      http.post("*/api/employee/sign-salary", async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ success: true });
      }),
    );

    function Probe() {
      const mutation = useSignSalaryMutation();
      const didRun = useRef(false);

      useEffect(() => {
        if (didRun.current) return;
        didRun.current = true;

        mutation
          .mutateAsync({
            employee_id: "NV001",
            salary_month: "2026-T13",
            cccd: "123456789012",
            is_t13: true,
          })
          .then(onDone);
      }, [mutation]);

      return null;
    }

    render(createElement(QueryWrapper, null, createElement(Probe)));

    await waitFor(() => expect(onDone).toHaveBeenCalled());

    expect(body).toMatchObject({
      employee_id: "NV001",
      salary_month: "2026-T13",
      cccd: "123456789012",
      is_t13: true,
    });
  });
});
