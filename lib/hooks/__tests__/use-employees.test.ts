import { createElement, useEffect, useRef } from "react";
import { render, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "tests/mocks/enable-msw";
import { QueryWrapper } from "tests/utils/query-wrapper";
import { useEmployeeMutation, useEmployeesQuery } from "../use-employees";

describe("use-employees hooks", () => {
  it("fetches employees with normalized list params", async () => {
    let requestUrl = "";
    const onSuccess = jest.fn();
    server.use(
      http.get("*/api/admin/employees", ({ request }) => {
        requestUrl = request.url;
        return HttpResponse.json({
          employees: [],
          pagination: { page: 2, limit: 200, total: 0, totalPages: 0 },
          departments: [],
        });
      }),
    );

    function Probe() {
      const query = useEmployeesQuery({
        page: 2,
        limit: 200,
        search: "NV01",
        department: "May",
        role: "ke_toan",
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
    expect(params.get("page")).toBe("2");
    expect(params.get("limit")).toBe("200");
    expect(params.get("search")).toBe("NV01");
    expect(params.get("department")).toBe("May");
    expect(params.get("role")).toBe("ke_toan");
  });

  it("deletes an employee through the encoded employee endpoint", async () => {
    let requestPath = "";
    const onDone = jest.fn();
    server.use(
      http.delete("*/api/admin/employees/:id", ({ request }) => {
        requestPath = new URL(request.url).pathname;
        return HttpResponse.json({ success: true });
      }),
    );

    function Probe() {
      const mutation = useEmployeeMutation();
      const didRun = useRef(false);

      useEffect(() => {
        if (didRun.current) return;
        didRun.current = true;

        mutation
          .mutateAsync({
            action: "delete",
            employee: { employee_id: "NV 01" },
          })
          .then(onDone);
      }, [mutation]);

      return null;
    }

    render(createElement(QueryWrapper, null, createElement(Probe)));

    await waitFor(() => expect(onDone).toHaveBeenCalled());

    expect(requestPath).toBe("/api/admin/employees/NV%2001");
  });
});
