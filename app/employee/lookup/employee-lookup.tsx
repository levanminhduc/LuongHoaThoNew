"use client";

import { lazy, Suspense, useEffect } from "react";
import type { ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Loader2, Search, Eye, EyeOff, Trash2, Info } from "lucide-react";
import Link from "next/link";
import { useEmployeeLookup } from "./use-employee-lookup";
import { EmployeeLookupResult } from "./employee-lookup-result";
import { T13_ENABLED } from "@/lib/feature-flags";

const loadPayrollDetailModal = () =>
  import("./payroll-detail-modal").then((m) => ({
    default: m.PayrollDetailModal,
  }));
const loadPayrollDetailModalT13 = () =>
  import("./payroll-detail-modal-t13").then((m) => ({
    default: m.PayrollDetailModalT13,
  }));
const loadSalaryHistoryModal = () =>
  import("./salary-history-modal").then((m) => ({
    default: m.SalaryHistoryModal,
  }));
const loadResetPasswordModal = () =>
  import("./reset-password-modal").then((m) => ({
    default: m.ResetPasswordModal,
  }));
const loadForgotPasswordModal = () =>
  import("./forgot-password-modal").then((m) => ({
    default: m.ForgotPasswordModal,
  }));

const PayrollDetailModal = lazy(loadPayrollDetailModal);
const PayrollDetailModalT13 = lazy(loadPayrollDetailModalT13);
const SalaryHistoryModal = lazy(loadSalaryHistoryModal);
const ResetPasswordModal = lazy(loadResetPasswordModal);
const ForgotPasswordModal = lazy(loadForgotPasswordModal);

export function EmployeeLookup() {
  const { state, dispatch, refs, handlers } = useEmployeeLookup();

  useEffect(() => {
    void loadForgotPasswordModal();
  }, []);

  useEffect(() => {
    if (!state.result) return;

    void Promise.all([
      loadPayrollDetailModal(),
      loadSalaryHistoryModal(),
      loadResetPasswordModal(),
    ]);
  }, [state.result]);

  useEffect(() => {
    if (!state.t13Result) return;

    void Promise.all([loadPayrollDetailModalT13(), loadSalaryHistoryModal()]);
  }, [state.t13Result]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Thông Tin Tra Cứu
          </CardTitle>
          <CardDescription className="flex items-center gap-1.5">
            Nhấn vào để xem hướng dẫn →
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="inline-flex h-5 w-5 items-center justify-center rounded-full border bg-background text-foreground hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  aria-label="Hướng dẫn nhập mã nhân viên"
                >
                  <Info className="w-4 h-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-80 text-sm">
                <p className="font-semibold text-foreground mb-2">
                  Hướng dẫn nhập Mã Nhân Viên
                </p>
                <div className="space-y-2 text-muted-foreground">
                  <div>
                    <p>
                      NV <strong>chính thức</strong>: nhập <strong>DB0</strong>{" "}
                      + mã NV
                    </p>
                    <p className="text-xs text-muted-foreground">
                      VD: Mã 1234 → DB01234
                    </p>
                  </div>
                  <div>
                    <p>
                      NV <strong>thử việc</strong>: nhập <strong>DBT0</strong> +
                      mã NV
                    </p>
                    <p className="text-xs text-muted-foreground">
                      VD: Mã 1234 → DBT01234
                    </p>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            method="post"
            action="/api/employee/lookup"
            onSubmit={handlers.handleSubmit}
            className="space-y-4"
            autoComplete="on"
          >
            <div className="space-y-2">
              <Label htmlFor="employeeId">Mã Nhân Viên</Label>
              <Input
                id="employeeId"
                name="employee_id"
                ref={refs.employeeIdInputRef}
                value={state.employeeId}
                onChange={handlers.handleEmployeeIdChange}
                placeholder="Nhập mã nhân viên (VD: DB01234)"
                required
                autoComplete="username"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cccd">Mật Khẩu / CCCD</Label>
              <div className="relative">
                <Input
                  id="cccd"
                  name="cccd"
                  type={state.showCccd ? "text" : "password"}
                  value={state.cccd}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    dispatch({ type: "SET_CCCD", payload: e.target.value })
                  }
                  placeholder="Nhập mật khẩu hoặc số CCCD"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => dispatch({ type: "TOGGLE_SHOW_CCCD" })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {state.showCccd ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember"
                  checked={state.rememberPassword}
                  onCheckedChange={(checked) =>
                    dispatch({ type: "SET_REMEMBER", payload: !!checked })
                  }
                />
                <label
                  htmlFor="remember"
                  className="text-sm text-muted-foreground cursor-pointer"
                >
                  Ghi nhớ đăng nhập
                </label>
              </div>
              {state.hasSavedCredentials && (
                <button
                  type="button"
                  onClick={handlers.handleClearSavedCredentials}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                >
                  <Trash2 className="w-3 h-3" />
                  Xóa lưu
                </button>
              )}
            </div>

            {state.error && (
              <Alert variant="destructive">
                <AlertDescription>{state.error}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button type="submit" className="flex-1" disabled={state.loading}>
                {state.loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang tra cứu...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Tra Cứu Lương
                  </>
                )}
              </Button>
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={() =>
                  dispatch({
                    type: "SHOW_MODAL",
                    payload: "showForgotPasswordModal",
                  })
                }
                className="text-sm text-primary underline-offset-4 hover:underline"
              >
                Quên mật khẩu?
              </button>
            </div>
          </form>
        </CardContent>
      </Card>

      {state.result && (
        <div ref={refs.salaryInfoRef}>
          <EmployeeLookupResult
            result={state.result}
            signingLoading={state.signingLoading}
            signSuccess={state.signSuccess}
            onSign={handlers.handleSignSalary}
            onShowDetail={() => handlers.handleShowDetail(false)}
            onShowHistory={() =>
              dispatch({ type: "SHOW_MODAL", payload: "showHistoryModal" })
            }
            onShowT13={handlers.handleT13Submit}
            onShowPassword={() =>
              dispatch({ type: "SHOW_MODAL", payload: "showPasswordModal" })
            }
            t13Loading={state.t13Loading}
          />
        </div>
      )}

      <div className="text-center text-sm text-muted-foreground">
        <Link
          href="/"
          className="text-primary underline-offset-4 hover:underline"
        >
          ← Quay về trang chủ
        </Link>
      </div>

      <Suspense fallback={null}>
        {state.result && state.showDetailModal && (
          <PayrollDetailModal
            isOpen={state.showDetailModal}
            onClose={() =>
              dispatch({ type: "HIDE_MODAL", payload: "showDetailModal" })
            }
            payrollData={state.detailData || state.result}
            isLoading={state.detailLoading}
            error={state.detailError}
          />
        )}

        {T13_ENABLED && state.t13Result && state.showT13DetailModal && (
          <PayrollDetailModalT13
            isOpen={state.showT13DetailModal}
            onClose={() =>
              dispatch({ type: "HIDE_MODAL", payload: "showT13DetailModal" })
            }
            payrollData={state.t13DetailData || state.t13Result}
            isLoading={state.detailLoading}
            error={state.detailError}
          />
        )}

        {state.employeeId &&
          (state.result || state.t13Result) &&
          state.showPasswordModal && (
            <ResetPasswordModal
              isOpen={state.showPasswordModal}
              onClose={() =>
                dispatch({ type: "HIDE_MODAL", payload: "showPasswordModal" })
              }
              employeeId={state.employeeId}
              cccd={state.cccd}
              employeeName={
                state.showT13Modal && state.t13Result
                  ? state.t13Result.full_name
                  : state.result?.full_name || ""
              }
              onPasswordReset={() =>
                dispatch({ type: "CLEAR_MUST_CHANGE_PASSWORD" })
              }
            />
          )}

        {state.employeeId && state.result && state.showHistoryModal && (
          <SalaryHistoryModal
            isOpen={state.showHistoryModal}
            onClose={() =>
              dispatch({ type: "HIDE_MODAL", payload: "showHistoryModal" })
            }
            employeeId={state.employeeId}
            cccd={state.cccd}
            sessionToken={state.sessionToken || undefined}
            currentMonth={state.result.salary_month}
            employeeName={state.result.full_name}
            isT13={false}
          />
        )}

        {T13_ENABLED &&
          state.employeeId &&
          state.t13Result &&
          state.showT13HistoryModal && (
            <SalaryHistoryModal
              isOpen={state.showT13HistoryModal}
              onClose={() =>
                dispatch({ type: "HIDE_MODAL", payload: "showT13HistoryModal" })
              }
              employeeId={state.employeeId}
              cccd={state.cccd}
              sessionToken={state.sessionToken || undefined}
              currentMonth={state.t13Result.salary_month}
              employeeName={state.t13Result.full_name}
              isT13={true}
            />
          )}

        <ForgotPasswordModal
          isOpen={state.showForgotPasswordModal}
          onClose={() =>
            dispatch({ type: "HIDE_MODAL", payload: "showForgotPasswordModal" })
          }
          onSuccess={() => dispatch({ type: "SET_ERROR", payload: "" })}
        />
      </Suspense>
    </div>
  );
}
