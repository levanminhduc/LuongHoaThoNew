/**
 * @jest-environment jsdom
 */
import { resolveLoginPath } from "../auth-redirect";

describe("resolveLoginPath", () => {
  it("returns /admin/login for admin paths", () => {
    expect(resolveLoginPath("/admin/employee-management")).toBe("/admin/login");
  });

  it("returns /admin/login for null pathname", () => {
    window.history.pushState({}, "", "/admin/dashboard");
    expect(resolveLoginPath(null)).toBe("/admin/login");
  });

  it("returns /admin/login for empty string", () => {
    expect(resolveLoginPath("")).toBe("/admin/login");
  });

  it("returns /admin/login for non-admin paths", () => {
    expect(resolveLoginPath("/director/dashboard")).toBe("/admin/login");
  });
});
