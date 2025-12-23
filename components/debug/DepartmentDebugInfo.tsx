/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Bug,
  User,
  Building2,
  Database,
  Eye,
  EyeOff,
  RefreshCw,
} from "lucide-react";

interface DebugInfo {
  userInfo: Record<string, unknown>;
  apiResponse: Record<string, unknown>;
  debugApiResponse: Record<string, unknown>;
  countApiResponse: Record<string, unknown>;
  rawDepartments: Array<Record<string, unknown>>;
  filteredDepartments: Array<Record<string, unknown>>;
  permissions: Array<Record<string, unknown>>;
}

export default function DepartmentDebugInfo() {
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDebugInfo = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem("admin_token");
      const userStr = localStorage.getItem("user_info");

      if (!token || !userStr) {
        setError("Không tìm thấy thông tin đăng nhập");
        return;
      }

      const userInfo = JSON.parse(userStr);

      // Call departments API (only active employees)
      const deptResponse = await fetch(
        "/api/admin/departments?include_stats=true",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const apiResponse = await deptResponse.json();

      // Call permissions API
      const permResponse = await fetch("/api/admin/department-permissions", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const permData = await permResponse.json();

      // Call debug API
      const debugResponse = await fetch("/api/debug/departments", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const debugData = await debugResponse.json();

      // Call count API
      const countResponse = await fetch("/api/debug/count-departments", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const countData = await countResponse.json();

      setDebugInfo({
        userInfo,
        apiResponse,
        debugApiResponse: debugData,
        countApiResponse: countData,
        rawDepartments: apiResponse.departments || [],
        filteredDepartments: apiResponse.departments || [],
        permissions: permData.permissions || [],
      });
    } catch (error) {
      console.error("Debug info error:", error);
      setError("Có lỗi xảy ra khi tải debug info");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (showDebug) {
      loadDebugInfo();
    }
  }, [showDebug]);

  if (!showDebug) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setShowDebug(true)}
          variant="outline"
          size="sm"
          className="bg-yellow-50 border-yellow-200 text-yellow-800 hover:bg-yellow-100"
        >
          <Bug className="h-4 w-4 mr-2" />
          Debug Departments
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Bug className="h-6 w-6" />
              Department Debug Information
            </h2>
            <div className="flex gap-2">
              <Button
                onClick={loadDebugInfo}
                disabled={loading}
                variant="outline"
                size="sm"
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
              <Button
                onClick={() => setShowDebug(false)}
                variant="outline"
                size="sm"
              >
                <EyeOff className="h-4 w-4 mr-2" />
                Close
              </Button>
            </div>
          </div>

          {error && (
            <Alert className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {loading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading debug info...</p>
            </div>
          )}

          {debugInfo && (
            <div className="space-y-6">
              {/* Department Count Summary */}
              {debugInfo.countApiResponse?.summary && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Database className="h-5 w-5" />
                      Department Count Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="text-center p-3 bg-blue-50 rounded">
                        <p className="text-2xl font-bold text-blue-600">
                          {
                            debugInfo.countApiResponse.summary
                              .total_departments_all
                          }
                        </p>
                        <p className="text-blue-800 font-medium">
                          Total Departments
                        </p>
                        <p className="text-xs text-blue-600">
                          Trong toàn bộ database
                        </p>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded">
                        <p className="text-2xl font-bold text-green-600">
                          {
                            debugInfo.countApiResponse.summary
                              .total_departments_active_only
                          }
                        </p>
                        <p className="text-green-800 font-medium">
                          Active Departments
                        </p>
                        <p className="text-xs text-green-600">
                          Hiển thị trong API hiện tại
                        </p>
                      </div>
                      <div className="text-center p-3 bg-red-50 rounded">
                        <p className="text-2xl font-bold text-red-600">
                          {
                            debugInfo.countApiResponse.summary
                              .departments_with_only_inactive_employees
                          }
                        </p>
                        <p className="text-red-800 font-medium">
                          Hidden Departments
                        </p>
                        <p className="text-xs text-red-600">
                          Chỉ có nhân viên inactive
                        </p>
                      </div>
                      <div className="text-center p-3 bg-yellow-50 rounded">
                        <p className="text-2xl font-bold text-yellow-600">
                          {debugInfo.countApiResponse.summary.total_employees}
                        </p>
                        <p className="text-yellow-800 font-medium">
                          Total Employees
                        </p>
                        <p className="text-xs text-yellow-600">
                          {debugInfo.countApiResponse.summary.active_employees}{" "}
                          active
                        </p>
                      </div>
                    </div>

                    {debugInfo.countApiResponse.analysis.is_55_limit_issue && (
                      <Alert className="mt-4">
                        <AlertDescription>
                          <strong>🚨 Phát hiện vấn đề:</strong> Database có{" "}
                          {
                            debugInfo.countApiResponse.analysis
                              .actual_department_count
                          }{" "}
                          departments nhưng chỉ{" "}
                          {
                            debugInfo.countApiResponse.analysis
                              .visible_in_current_api
                          }{" "}
                          departments hiển thị trong API.
                          <br />
                          <strong>Nguyên nhân:</strong> API chỉ lấy departments
                          có nhân viên active (is_active = true).
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* User Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Current User Info
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-medium">Employee ID:</p>
                      <p className="text-gray-600">
                        {debugInfo.userInfo.employee_id}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium">Role:</p>
                      <Badge variant="outline">{debugInfo.userInfo.role}</Badge>
                    </div>
                    <div>
                      <p className="font-medium">Department:</p>
                      <p className="text-gray-600">
                        {debugInfo.userInfo.department}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium">Allowed Departments:</p>
                      <p className="text-gray-600">
                        {debugInfo.userInfo.allowed_departments?.join(", ") ||
                          "None"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* API Response */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    API Response Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="font-medium">Success:</p>
                      <Badge
                        variant={
                          debugInfo.apiResponse.success
                            ? "default"
                            : "destructive"
                        }
                      >
                        {debugInfo.apiResponse.success ? "Yes" : "No"}
                      </Badge>
                    </div>
                    <div>
                      <p className="font-medium">Total Departments:</p>
                      <p className="text-gray-600">
                        {debugInfo.apiResponse.total_departments || 0}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium">Month:</p>
                      <p className="text-gray-600">
                        {debugInfo.apiResponse.month}
                      </p>
                    </div>
                  </div>
                  {debugInfo.apiResponse.error && (
                    <Alert className="mt-4">
                      <AlertDescription>
                        {debugInfo.apiResponse.error}
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              {/* Departments List */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Departments Returned ({debugInfo.rawDepartments.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {debugInfo.rawDepartments.length === 0 ? (
                    <p className="text-gray-500 italic">
                      No departments returned from API
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {debugInfo.rawDepartments.map((dept, index) => (
                        <div key={index} className="border rounded p-3">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-medium">{dept.name}</h4>
                            <Badge variant="outline">
                              {dept.employeeCount} employees
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                            <div>Payrolls: {dept.payrollCount}</div>
                            <div>Signed: {dept.signedPercentage}%</div>
                            <div>Managers: {dept.managers?.length || 0}</div>
                            <div>
                              Supervisors: {dept.supervisors?.length || 0}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Debug Analysis */}
              {debugInfo.debugApiResponse?.debug_info && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Database className="h-5 w-5" />
                      Database Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="font-medium">All Departments (DB):</p>
                          <p className="text-gray-600">
                            {
                              debugInfo.debugApiResponse.debug_info
                                .query_results.unique_all_departments
                            }
                          </p>
                        </div>
                        <div>
                          <p className="font-medium">
                            Active Departments (API):
                          </p>
                          <p className="text-gray-600">
                            {
                              debugInfo.debugApiResponse.debug_info
                                .query_results.unique_active_departments
                            }
                          </p>
                        </div>
                        <div>
                          <p className="font-medium">Missing from Active:</p>
                          <p className="text-red-600">
                            {
                              debugInfo.debugApiResponse.debug_info.departments
                                .missing_from_active.length
                            }
                          </p>
                        </div>
                        <div>
                          <p className="font-medium">Null/Empty Departments:</p>
                          <p className="text-yellow-600">
                            {
                              debugInfo.debugApiResponse.debug_info
                                .query_results.null_empty_departments
                            }
                          </p>
                        </div>
                      </div>

                      {debugInfo.debugApiResponse.debug_info.departments
                        .missing_from_active.length > 0 && (
                        <Alert>
                          <AlertDescription>
                            <strong>
                              Departments missing from active list:
                            </strong>
                            <br />
                            {debugInfo.debugApiResponse.debug_info.departments.missing_from_active.join(
                              ", ",
                            )}
                            <br />
                            <br />
                            <em>
                              These departments have employees but all employees
                              are inactive (is_active = false)
                            </em>
                          </AlertDescription>
                        </Alert>
                      )}

                      {debugInfo.debugApiResponse.debug_info.analysis
                        .departments_without_permissions.length > 0 && (
                        <Alert>
                          <AlertDescription>
                            <strong>Departments without permissions:</strong>
                            <br />
                            {debugInfo.debugApiResponse.debug_info.analysis.departments_without_permissions.join(
                              ", ",
                            )}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Raw JSON */}
              <Card>
                <CardHeader>
                  <CardTitle>Raw API Response (JSON)</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="bg-gray-100 p-4 rounded text-xs overflow-x-auto">
                    {JSON.stringify(debugInfo.apiResponse, null, 2)}
                  </pre>
                </CardContent>
              </Card>

              {/* Debug JSON */}
              {debugInfo.debugApiResponse && (
                <Card>
                  <CardHeader>
                    <CardTitle>Debug API Response (JSON)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="bg-gray-100 p-4 rounded text-xs overflow-x-auto">
                      {JSON.stringify(debugInfo.debugApiResponse, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
