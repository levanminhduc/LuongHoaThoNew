import { createElement, useEffect } from "react";
import { render, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "tests/mocks/enable-msw";
import { QueryWrapper } from "tests/utils/query-wrapper";
import { payrollTemplatePath, useDepartmentsQuery } from "../use-bulk-export";

jest.mock("@/lib/toast-utils", () => ({
  showSuccessToast: jest.fn(),
  showErrorToast: jest.fn(),
}));

describe("use-bulk-export hooks", () => {
  it("fetches departments from the departments endpoint", async () => {
    let requestPath = "";
    const onSuccess = jest.fn();
    server.use(
      http.get("*/api/admin/departments", ({ request }) => {
        requestPath = new URL(request.url).pathname;
        return HttpResponse.json({
          success: true,
          departments: [{ name: "May" }],
        });
      }),
    );

    function Probe() {
      const query = useDepartmentsQuery();

      useEffect(() => {
        if (query.isSuccess) {
          onSuccess();
        }
      }, [query.isSuccess]);

      return null;
    }

    render(createElement(QueryWrapper, null, createElement(Probe)));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());

    expect(requestPath).toBe("/api/admin/departments");
  });

  it("builds payroll template path with canonical query params", () => {
    const path = payrollTemplatePath({
      includeData: true,
      salaryMonth: "2026-04",
      configId: 7,
    });

    const url = new URL(path, "http://localhost");
    expect(url.pathname).toBe("/api/admin/payroll-export-template");
    expect(url.searchParams.get("includeData")).toBe("true");
    expect(url.searchParams.get("salaryMonth")).toBe("2026-04");
    expect(url.searchParams.get("configId")).toBe("7");
  });
});
