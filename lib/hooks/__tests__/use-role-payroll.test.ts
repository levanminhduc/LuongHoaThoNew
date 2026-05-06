import { createElement, useEffect } from "react";
import { render, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "tests/mocks/enable-msw";
import { QueryWrapper } from "tests/utils/query-wrapper";
import {
  useEmployeePayrollDataQuery,
  useManagerPayrollQuery,
  useSupervisorPayrollQuery,
} from "../use-role-payroll";

describe("use-role-payroll hooks", () => {
  it("fetches manager, supervisor, and employee dashboard data through role endpoints", async () => {
    let managerUrl = "";
    let supervisorUrl = "";
    let employeeUrl = "";
    const onSuccess = jest.fn();

    server.use(
      http.get("*/api/payroll/my-departments", ({ request }) => {
        managerUrl = request.url;
        return HttpResponse.json({ success: true, data: [] });
      }),
      http.get("*/api/payroll/my-department", ({ request }) => {
        supervisorUrl = request.url;
        return HttpResponse.json({ success: true, data: [] });
      }),
      http.get("*/api/payroll/my-data", ({ request }) => {
        employeeUrl = request.url;
        return HttpResponse.json({ success: true, data: [] });
      }),
    );

    function Probe() {
      const managerQuery = useManagerPayrollQuery("2026-04", "May 1");
      const supervisorQuery = useSupervisorPayrollQuery("2026-04");
      const employeeQuery = useEmployeePayrollDataQuery(6);

      useEffect(() => {
        if (
          managerQuery.isSuccess &&
          supervisorQuery.isSuccess &&
          employeeQuery.isSuccess
        ) {
          onSuccess();
        }
      }, [
        employeeQuery.isSuccess,
        managerQuery.isSuccess,
        supervisorQuery.isSuccess,
      ]);

      return null;
    }

    render(createElement(QueryWrapper, null, createElement(Probe)));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());

    const managerParams = new URL(managerUrl).searchParams;
    expect(managerParams.get("month")).toBe("2026-04");
    expect(managerParams.get("department")).toBe("May 1");
    expect(managerParams.get("limit")).toBe("50");

    const supervisorParams = new URL(supervisorUrl).searchParams;
    expect(supervisorParams.get("month")).toBe("2026-04");
    expect(supervisorParams.get("limit")).toBe("100");

    const employeeParams = new URL(employeeUrl).searchParams;
    expect(employeeParams.get("limit")).toBe("6");
  });
});
