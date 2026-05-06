import { createElement, useEffect, useRef } from "react";
import { render, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "tests/mocks/enable-msw";
import { QueryWrapper } from "tests/utils/query-wrapper";
import { useColumnAliasesMutation } from "../use-payroll-import";

jest.mock("@/lib/toast-utils", () => ({
  showSuccessToast: jest.fn(),
  showErrorToast: jest.fn(),
}));

describe("use-payroll-import hooks", () => {
  it("loads column aliases with limit and active filters", async () => {
    let requestUrl = "";
    const onDone = jest.fn();
    server.use(
      http.get("*/api/admin/column-aliases", ({ request }) => {
        requestUrl = request.url;
        return HttpResponse.json({
          success: true,
          data: [],
        });
      }),
    );

    function Probe() {
      const mutation = useColumnAliasesMutation();
      const didRun = useRef(false);

      useEffect(() => {
        if (didRun.current) return;
        didRun.current = true;

        mutation
          .mutateAsync({ limit: 200, is_active: true })
          .then(onDone);
      }, [mutation]);

      return null;
    }

    render(createElement(QueryWrapper, null, createElement(Probe)));

    await waitFor(() => expect(onDone).toHaveBeenCalled());

    const params = new URL(requestUrl).searchParams;
    expect(params.get("limit")).toBe("200");
    expect(params.get("is_active")).toBe("true");
  });
});
