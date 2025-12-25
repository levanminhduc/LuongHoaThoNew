"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import "swagger-ui-react/swagger-ui.css";

function suppressSwaggerWarnings() {
  const originalError = console.error;
  console.error = (...args: unknown[]) => {
    const message = args[0];
    if (
      typeof message === "string" &&
      message.includes("UNSAFE_componentWillReceiveProps")
    ) {
      return;
    }
    originalError.apply(console, args);
  };
  return () => {
    console.error = originalError;
  };
}

const SwaggerUI = dynamic(() => import("swagger-ui-react"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Đang tải tài liệu API...</p>
      </div>
    </div>
  ),
});

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  user: {
    username: string;
    role: string;
  } | null;
}

export default function ApiDocsPage() {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    error: null,
    user: null,
  });

  useEffect(() => {
    const restore = suppressSwaggerWarnings();
    return restore;
  }, []);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch("/api/api-docs/openapi", {
        credentials: "include",
      });

      if (response.ok) {
        const token = document.cookie
          .split("; ")
          .find((row) => row.startsWith("auth_token="));

        if (token) {
          const payload = JSON.parse(atob(token.split("=")[1].split(".")[1]));
          setAuthState({
            isAuthenticated: true,
            isLoading: false,
            error: null,
            user: {
              username: payload.username,
              role: payload.role,
            },
          });
        } else {
          setAuthState({
            isAuthenticated: true,
            isLoading: false,
            error: null,
            user: null,
          });
        }
      } else {
        setAuthState({
          isAuthenticated: false,
          isLoading: false,
          error: "Bạn cần đăng nhập với quyền admin để xem tài liệu API",
          user: null,
        });
      }
    } catch {
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        error: "Không thể kết nối đến server",
        user: null,
      });
    }
  };

  if (authState.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang kiểm tra quyền truy cập...</p>
        </div>
      </div>
    );
  }

  if (!authState.isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
          <div className="text-center">
            <svg
              className="mx-auto h-16 w-16 text-red-500 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Truy cập bị từ chối
            </h1>
            <p className="text-gray-600 mb-6">{authState.error}</p>
            <a
              href="/admin/login"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Đăng nhập Admin
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-gray-800 text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-lg font-semibold">API Documentation</h1>
          <span className="text-sm text-gray-300">
            Hệ thống Quản lý Lương - May Hòa Thọ Điện Bàn
          </span>
        </div>
        {authState.user && (
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-300">
              {authState.user.username} ({authState.user.role})
            </span>
            <a
              href="/admin"
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              ← Quay lại Admin
            </a>
          </div>
        )}
      </div>
      <SwaggerUI
        url="/api/api-docs/openapi"
        docExpansion="list"
        defaultModelsExpandDepth={1}
        displayRequestDuration={true}
        filter={true}
        showExtensions={true}
        showCommonExtensions={true}
        requestInterceptor={(req) => {
          const token = document.cookie
            .split("; ")
            .find((row) => row.startsWith("auth_token="));
          if (token) {
            req.headers["Authorization"] = `Bearer ${token.split("=")[1]}`;
          }
          return req;
        }}
      />
    </div>
  );
}
