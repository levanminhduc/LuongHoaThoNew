"use client";

import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Search, Loader2, User, AlertCircle } from "lucide-react";

interface Employee {
  employee_id: string;
  full_name: string;
  department: string;
  chuc_vu: string;
  is_active: boolean;
}

interface EmployeeSearchFormProps {
  onEmployeeSelect: (employee: Employee) => void;
}

export function EmployeeSearchForm({
  onEmployeeSelect,
}: EmployeeSearchFormProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const searchEmployees = useCallback(async (query: string) => {
    if (query.length < 2) {
      setEmployees([]);
      setHasSearched(false);
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const token = localStorage.getItem("admin_token");
      const response = await fetch(
        `/api/employees/update-cccd?q=${encodeURIComponent(query)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();

      if (data.success) {
        setEmployees(data.employees);
        setHasSearched(true);
      } else {
        setError(data.error || "Có lỗi xảy ra khi tìm kiếm");
        setEmployees([]);
      }
    } catch (error) {
      console.error("Error searching employees:", error);
      setError("Lỗi kết nối. Vui lòng thử lại.");
      setEmployees([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchEmployees(searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, searchEmployees]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleEmployeeClick = (employee: Employee) => {
    onEmployeeSelect(employee);
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          type="text"
          placeholder="Nhập mã nhân viên hoặc tên nhân viên..."
          value={searchQuery}
          onChange={handleInputChange}
          className="pl-10"
        />
        {isSearching && (
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 animate-spin" />
        )}
      </div>

      {error && (
        <Alert className="border-red-500 bg-red-50">
          <AlertCircle className="w-4 h-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {hasSearched && employees.length === 0 && !error && !isSearching && (
        <Alert>
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>
            {`Không tìm thấy nhân viên nào với từ khóa "${searchQuery}"`}
          </AlertDescription>
        </Alert>
      )}

      {employees.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-gray-600">
            Tìm thấy {employees.length} nhân viên:
          </p>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {employees.map((employee) => (
              <div
                key={employee.employee_id}
                className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => handleEmployeeClick(employee)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-gray-400" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">
                          {employee.full_name}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {employee.employee_id}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600">
                        {employee.department} • {employee.chuc_vu}
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    Chọn
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {searchQuery.length > 0 && searchQuery.length < 2 && (
        <p className="text-sm text-gray-500">
          Nhập ít nhất 2 ký tự để tìm kiếm
        </p>
      )}
    </div>
  );
}
