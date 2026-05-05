"use client";

import {
  useReducer,
  useRef,
  useEffect,
  useCallback,
  useLayoutEffect,
} from "react";
import type { FormEvent, ChangeEvent } from "react";
import type { PayrollResult } from "@/lib/types/payroll";
import { getVietnamTimestamp } from "@/lib/utils/vietnam-timezone";

const STORAGE_KEY = "salary_lookup_credentials";
let autoLookupInFlight = false;

function encodeCredentials(employeeId: string, password: string): string {
  const data = JSON.stringify({ e: employeeId, p: password, t: Date.now() });
  return btoa(encodeURIComponent(data));
}

function decodeCredentials(): { employeeId: string; password: string } | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const decoded = decodeURIComponent(atob(stored));
    const data = JSON.parse(decoded);
    if (data.e && data.p) {
      return { employeeId: data.e, password: data.p };
    }
    return null;
  } catch {
    return null;
  }
}

function saveCredentials(employeeId: string, password: string): void {
  localStorage.setItem(STORAGE_KEY, encodeCredentials(employeeId, password));
}

function clearCredentials(): void {
  localStorage.removeItem(STORAGE_KEY);
}

interface LookupState {
  employeeId: string;
  cccd: string;
  showCccd: boolean;
  loading: boolean;
  t13Loading: boolean;
  result: PayrollResult | null;
  t13Result: PayrollResult | null;
  error: string;
  sessionToken: string | null;
  signingLoading: boolean;
  signSuccess: boolean;
  t13SigningLoading: boolean;
  t13SignSuccess: boolean;
  detailData: PayrollResult | null;
  detailLoading: boolean;
  t13DetailData: PayrollResult | null;
  showDetailModal: boolean;
  showT13Modal: boolean;
  showT13DetailModal: boolean;
  showPasswordModal: boolean;
  showHistoryModal: boolean;
  showT13HistoryModal: boolean;
  showForgotPasswordModal: boolean;
  rememberPassword: boolean;
  hasSavedCredentials: boolean;
}

type LookupAction =
  | { type: "SET_EMPLOYEE_ID"; payload: string }
  | { type: "SET_CCCD"; payload: string }
  | { type: "TOGGLE_SHOW_CCCD" }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_T13_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string }
  | {
      type: "LOOKUP_SUCCESS";
      payload: { result: PayrollResult; sessionToken: string };
    }
  | { type: "T13_LOOKUP_SUCCESS"; payload: { result: PayrollResult } }
  | { type: "SET_RESULT"; payload: PayrollResult | null }
  | { type: "SIGN_START" }
  | { type: "SIGN_SUCCESS"; payload: Partial<PayrollResult> }
  | { type: "SIGN_END" }
  | { type: "T13_SIGN_START" }
  | { type: "T13_SIGN_SUCCESS"; payload: Partial<PayrollResult> }
  | { type: "T13_SIGN_END" }
  | {
      type: "SHOW_MODAL";
      payload: keyof Pick<
        LookupState,
        | "showDetailModal"
        | "showT13Modal"
        | "showT13DetailModal"
        | "showPasswordModal"
        | "showHistoryModal"
        | "showT13HistoryModal"
        | "showForgotPasswordModal"
      >;
    }
  | {
      type: "HIDE_MODAL";
      payload: keyof Pick<
        LookupState,
        | "showDetailModal"
        | "showT13Modal"
        | "showT13DetailModal"
        | "showPasswordModal"
        | "showHistoryModal"
        | "showT13HistoryModal"
        | "showForgotPasswordModal"
      >;
    }
  | { type: "SET_REMEMBER"; payload: boolean }
  | { type: "SET_DETAIL_LOADING"; payload: boolean }
  | { type: "SET_DETAIL_DATA"; payload: PayrollResult | null }
  | { type: "SET_T13_DETAIL_DATA"; payload: PayrollResult | null }
  | {
      type: "RESTORE_CREDENTIALS";
      payload: { employeeId: string; password: string };
    }
  | { type: "CLEAR_CREDENTIALS" }
  | { type: "CLEAR_MUST_CHANGE_PASSWORD" };

const initialState: LookupState = {
  employeeId: "",
  cccd: "",
  showCccd: false,
  loading: false,
  t13Loading: false,
  result: null,
  t13Result: null,
  error: "",
  sessionToken: null,
  signingLoading: false,
  signSuccess: false,
  t13SigningLoading: false,
  t13SignSuccess: false,
  showDetailModal: false,
  showT13Modal: false,
  showT13DetailModal: false,
  detailData: null,
  detailLoading: false,
  t13DetailData: null,
  showPasswordModal: false,
  showHistoryModal: false,
  showT13HistoryModal: false,
  showForgotPasswordModal: false,
  rememberPassword: false,
  hasSavedCredentials: false,
};

function lookupReducer(state: LookupState, action: LookupAction): LookupState {
  switch (action.type) {
    case "SET_EMPLOYEE_ID":
      return { ...state, employeeId: action.payload };
    case "SET_CCCD":
      return { ...state, cccd: action.payload };
    case "TOGGLE_SHOW_CCCD":
      return { ...state, showCccd: !state.showCccd };
    case "SET_LOADING":
      return { ...state, loading: action.payload };
    case "SET_T13_LOADING":
      return { ...state, t13Loading: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload };
    case "LOOKUP_SUCCESS":
      return {
        ...state,
        result: action.payload.result,
        sessionToken: action.payload.sessionToken,
        error: "",
        loading: false,
      };
    case "T13_LOOKUP_SUCCESS":
      return {
        ...state,
        t13Result: action.payload.result,
        showT13Modal: true,
        error: "",
        t13Loading: false,
      };
    case "SET_RESULT":
      return { ...state, result: action.payload };
    case "SIGN_START":
      return { ...state, signingLoading: true, error: "" };
    case "SIGN_SUCCESS":
      return {
        ...state,
        signingLoading: false,
        signSuccess: true,
        result: state.result ? { ...state.result, ...action.payload } : null,
      };
    case "SIGN_END":
      return { ...state, signingLoading: false };
    case "T13_SIGN_START":
      return { ...state, t13SigningLoading: true };
    case "T13_SIGN_SUCCESS":
      return {
        ...state,
        t13SigningLoading: false,
        t13SignSuccess: true,
        t13Result: state.t13Result
          ? { ...state.t13Result, ...action.payload }
          : null,
      };
    case "T13_SIGN_END":
      return { ...state, t13SigningLoading: false };
    case "SHOW_MODAL":
      return { ...state, [action.payload]: true };
    case "HIDE_MODAL":
      return { ...state, [action.payload]: false };
    case "SET_REMEMBER":
      return { ...state, rememberPassword: action.payload };
    case "SET_DETAIL_LOADING":
      return { ...state, detailLoading: action.payload };
    case "SET_DETAIL_DATA":
      return { ...state, detailData: action.payload, detailLoading: false };
    case "SET_T13_DETAIL_DATA":
      return { ...state, t13DetailData: action.payload };
    case "RESTORE_CREDENTIALS":
      return {
        ...state,
        employeeId: action.payload.employeeId,
        cccd: action.payload.password,
        rememberPassword: true,
        hasSavedCredentials: true,
      };
    case "CLEAR_CREDENTIALS":
      return {
        ...state,
        employeeId: "",
        cccd: "",
        rememberPassword: false,
        hasSavedCredentials: false,
        result: null,
        t13Result: null,
        sessionToken: null,
        error: "",
      };
    case "CLEAR_MUST_CHANGE_PASSWORD":
      return { ...state, error: "" };
    default:
      return state;
  }
}

export function useEmployeeLookup() {
  const [state, dispatch] = useReducer(lookupReducer, initialState);
  const salaryInfoRef = useRef<HTMLDivElement>(null);
  const employeeIdInputRef = useRef<HTMLInputElement>(null);
  const cursorPositionRef = useRef<number | null>(null);
  const autoLookupStartedRef = useRef(false);

  useLayoutEffect(() => {
    if (cursorPositionRef.current === null || !employeeIdInputRef.current)
      return;
    const input = employeeIdInputRef.current;
    const position = cursorPositionRef.current;
    input.setSelectionRange(position, position);
    cursorPositionRef.current = null;
  }, [state.employeeId]);

  const handleEmployeeIdChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const input = e.target;
      cursorPositionRef.current = input.selectionStart;
      dispatch({ type: "SET_EMPLOYEE_ID", payload: input.value.toUpperCase() });
    },
    [],
  );

  const handleClearSavedCredentials = useCallback(() => {
    clearCredentials();
    dispatch({ type: "CLEAR_CREDENTIALS" });
  }, []);

  const getAuthHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (state.sessionToken) {
      headers["Authorization"] = `Bearer ${state.sessionToken}`;
    }
    return headers;
  }, [state.sessionToken]);

  const runLookup = useCallback(
    async ({
      employeeId,
      password,
      rememberPassword,
      shouldScroll,
    }: {
      employeeId: string;
      password: string;
      rememberPassword: boolean;
      shouldScroll: boolean;
    }) => {
      dispatch({ type: "SET_LOADING", payload: true });
      dispatch({ type: "SET_ERROR", payload: "" });

      try {
        const response = await fetch("/api/employee/lookup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            employee_id: employeeId.trim(),
            cccd: password.trim(),
          }),
        });

        const data = await response.json();

        if (response.ok) {
          dispatch({
            type: "LOOKUP_SUCCESS",
            payload: {
              result: data.payroll,
              sessionToken: data.session_token || "",
            },
          });

          if (rememberPassword) {
            saveCredentials(employeeId.trim(), password.trim());
          } else {
            clearCredentials();
          }

          if (shouldScroll) {
            setTimeout(() => {
              salaryInfoRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "start",
              });
            }, 100);
          }
        } else {
          dispatch({
            type: "SET_ERROR",
            payload: data.error || "Không tìm thấy thông tin lương",
          });
          dispatch({ type: "SET_LOADING", payload: false });
        }
      } catch {
        dispatch({
          type: "SET_ERROR",
          payload: "Có lỗi xảy ra khi tra cứu thông tin",
        });
        dispatch({ type: "SET_LOADING", payload: false });
      }
    },
    [],
  );

  useEffect(() => {
    if (autoLookupStartedRef.current || autoLookupInFlight) return;
    const saved = decodeCredentials();
    if (!saved) return;

    autoLookupStartedRef.current = true;
    autoLookupInFlight = true;
    dispatch({ type: "RESTORE_CREDENTIALS", payload: saved });
    void runLookup({
      employeeId: saved.employeeId,
      password: saved.password,
      rememberPassword: true,
      shouldScroll: true,
    }).finally(() => {
      autoLookupInFlight = false;
    });
  }, [runLookup]);

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      await runLookup({
        employeeId: state.employeeId,
        password: state.cccd,
        rememberPassword: state.rememberPassword,
        shouldScroll: true,
      });
    },
    [runLookup, state.employeeId, state.cccd, state.rememberPassword],
  );

  const handleT13Submit = useCallback(async () => {
    if (!state.employeeId || !state.cccd) {
      dispatch({
        type: "SET_ERROR",
        payload: "Vui lòng nhập đầy đủ Mã Nhân Viên và Mật khẩu / CCCD",
      });
      return;
    }

    dispatch({ type: "SET_T13_LOADING", payload: true });
    dispatch({ type: "SET_ERROR", payload: "" });

    try {
      const response = await fetch("/api/employee/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_id: state.employeeId.trim(),
          cccd: state.cccd.trim(),
          is_t13: true,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        dispatch({
          type: "T13_LOOKUP_SUCCESS",
          payload: { result: data.payroll },
        });

        if (state.rememberPassword) {
          saveCredentials(state.employeeId.trim(), state.cccd.trim());
        } else {
          clearCredentials();
        }
      } else {
        dispatch({
          type: "SET_ERROR",
          payload: data.error || "Không tìm thấy thông tin lương T13",
        });
        dispatch({ type: "SET_T13_LOADING", payload: false });
      }
    } catch {
      dispatch({
        type: "SET_ERROR",
        payload: "Có lỗi xảy ra khi tra cứu thông tin",
      });
      dispatch({ type: "SET_T13_LOADING", payload: false });
    }
  }, [state.employeeId, state.cccd, state.rememberPassword]);

  const handleSignSalary = useCallback(async () => {
    if (!state.result || !state.employeeId || !state.cccd) return;

    dispatch({ type: "SIGN_START" });

    try {
      const vietnamTime = getVietnamTimestamp();
      const response = await fetch("/api/employee/sign-salary", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          employee_id: state.employeeId.trim(),
          cccd: state.sessionToken ? undefined : state.cccd.trim(),
          salary_month: state.result.salary_month,
          client_timestamp: vietnamTime,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        dispatch({
          type: "SIGN_SUCCESS",
          payload: {
            is_signed: true,
            signed_at: data.data.signed_at,
            signed_at_display: data.data.signed_at_display,
            signed_by_name: data.data.employee_name || data.data.signed_by,
          },
        });
        setTimeout(() => dispatch({ type: "SIGN_END" }), 5000);
      } else {
        if (data.error?.includes("đã ký nhận lương")) {
          dispatch({
            type: "SET_ERROR",
            payload:
              "Bạn đã ký nhận lương tháng này rồi. Vui lòng refresh trang để cập nhật trạng thái.",
          });
        } else if (data.error?.includes("CCCD không đúng")) {
          dispatch({
            type: "SET_ERROR",
            payload: "Mật khẩu / CCCD không đúng. Vui lòng kiểm tra lại.",
          });
        } else if (data.error?.includes("không tìm thấy nhân viên")) {
          dispatch({
            type: "SET_ERROR",
            payload: "Không tìm thấy nhân viên với mã nhân viên đã nhập.",
          });
        } else {
          dispatch({
            type: "SET_ERROR",
            payload:
              data.error ||
              `Không thể ký nhận lương (Mã lỗi: ${response.status})`,
          });
        }
        dispatch({ type: "SIGN_END" });
      }
    } catch {
      dispatch({
        type: "SET_ERROR",
        payload:
          "Lỗi kết nối mạng. Vui lòng kiểm tra kết nối internet và thử lại.",
      });
      dispatch({ type: "SIGN_END" });
    }
  }, [
    state.result,
    state.employeeId,
    state.cccd,
    state.sessionToken,
    getAuthHeaders,
  ]);

  const handleSignT13 = useCallback(async () => {
    if (!state.t13Result || !state.employeeId || !state.cccd) return;

    dispatch({ type: "T13_SIGN_START" });

    try {
      const vietnamTime = getVietnamTimestamp();
      const response = await fetch("/api/employee/sign-salary", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          employee_id: state.employeeId.trim(),
          cccd: state.sessionToken ? undefined : state.cccd.trim(),
          salary_month: state.t13Result.salary_month,
          client_timestamp: vietnamTime,
          is_t13: true,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        dispatch({
          type: "T13_SIGN_SUCCESS",
          payload: {
            is_signed: true,
            signed_at: data.data.signed_at,
            signed_at_display: data.data.signed_at_display,
            signed_by_name: data.data.employee_name || data.data.signed_by,
          },
        });
        setTimeout(() => dispatch({ type: "T13_SIGN_END" }), 5000);
      } else {
        dispatch({
          type: "SET_ERROR",
          payload: data.error || "Không thể ký nhận lương",
        });
        dispatch({ type: "T13_SIGN_END" });
      }
    } catch {
      dispatch({
        type: "SET_ERROR",
        payload: "Lỗi kết nối mạng. Vui lòng thử lại.",
      });
      dispatch({ type: "T13_SIGN_END" });
    }
  }, [
    state.t13Result,
    state.employeeId,
    state.cccd,
    state.sessionToken,
    getAuthHeaders,
  ]);

  const handleShowDetail = useCallback(
    async (isT13 = false) => {
      if (!state.sessionToken) return;

      dispatch({ type: "SET_DETAIL_LOADING", payload: true });

      try {
        const params = new URLSearchParams();
        if (isT13) params.set("is_t13", "true");

        const response = await fetch(
          `/api/employee/detail?${params.toString()}`,
          {
            headers: {
              Authorization: `Bearer ${state.sessionToken}`,
            },
          },
        );

        const data = await response.json();

        if (response.ok) {
          if (isT13) {
            dispatch({ type: "SET_T13_DETAIL_DATA", payload: data.payroll });
            dispatch({ type: "SHOW_MODAL", payload: "showT13DetailModal" });
          } else {
            dispatch({ type: "SET_DETAIL_DATA", payload: data.payroll });
            dispatch({ type: "SHOW_MODAL", payload: "showDetailModal" });
          }
        } else {
          dispatch({
            type: "SET_ERROR",
            payload: data.error || "Không thể tải chi tiết lương",
          });
          dispatch({ type: "SET_DETAIL_LOADING", payload: false });
        }
      } catch {
        dispatch({
          type: "SET_ERROR",
          payload: "Có lỗi xảy ra khi tải chi tiết lương",
        });
        dispatch({ type: "SET_DETAIL_LOADING", payload: false });
      }
    },
    [state.sessionToken],
  );

  return {
    state,
    dispatch,
    refs: { salaryInfoRef, employeeIdInputRef },
    handlers: {
      handleEmployeeIdChange,
      handleClearSavedCredentials,
      handleSubmit,
      handleT13Submit,
      handleSignSalary,
      handleSignT13,
      handleShowDetail,
    },
  };
}
