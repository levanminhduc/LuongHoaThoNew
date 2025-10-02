"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Loader2, Save, AlertCircle, Shield } from "lucide-react";

interface CCCDUpdateFormProps {
  onSubmit: (newCCCD: string) => void;
  isLoading: boolean;
  employeeName: string;
}

export function CCCDUpdateForm({
  onSubmit,
  isLoading,
  employeeName,
}: CCCDUpdateFormProps) {
  const [newCCCD, setNewCCCD] = useState("");
  const [confirmCCCD, setConfirmCCCD] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  const validateCCCD = (cccd: string): string[] => {
    const validationErrors: string[] = [];

    if (!cccd) {
      validationErrors.push("Số CCCD không được để trống");
      return validationErrors;
    }

    if (cccd.length !== 12) {
      validationErrors.push("Số CCCD phải có đúng 12 chữ số");
    }

    if (!/^\d{12}$/.test(cccd)) {
      validationErrors.push("Số CCCD chỉ được chứa các chữ số");
    }

    return validationErrors;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors: string[] = [];

    const cccdErrors = validateCCCD(newCCCD);
    validationErrors.push(...cccdErrors);

    if (newCCCD !== confirmCCCD) {
      validationErrors.push("Số CCCD xác nhận không khớp");
    }

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors([]);
    onSubmit(newCCCD);
  };

  const handleNewCCCDChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 12);
    setNewCCCD(value);
    setErrors([]);
  };

  const handleConfirmCCCDChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 12);
    setConfirmCCCD(value);
    setErrors([]);
  };

  const isFormValid =
    newCCCD.length === 12 &&
    confirmCCCD.length === 12 &&
    newCCCD === confirmCCCD;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Alert className="border-blue-500 bg-blue-50">
        <Shield className="w-4 h-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <strong>Lưu ý bảo mật:</strong> Số CCCD sẽ được mã hóa bằng bcrypt
          trước khi lưu vào database. Việc cập nhật này sẽ thay thế hoàn toàn số
          CCCD cũ của nhân viên <strong>{employeeName}</strong>.
        </AlertDescription>
      </Alert>

      {errors.length > 0 && (
        <Alert className="border-red-500 bg-red-50">
          <AlertCircle className="w-4 h-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <ul className="list-disc list-inside space-y-1">
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        <div>
          <Label htmlFor="newCCCD" className="text-sm font-medium">
            Số CCCD mới <span className="text-red-500">*</span>
          </Label>
          <Input
            id="newCCCD"
            type="text"
            placeholder="Nhập 12 chữ số CCCD mới"
            value={newCCCD}
            onChange={handleNewCCCDChange}
            maxLength={12}
            className="mt-1"
            disabled={isLoading}
          />
          <p className="text-xs text-gray-500 mt-1">
            Đã nhập: {newCCCD.length}/12 chữ số
          </p>
        </div>

        <div>
          <Label htmlFor="confirmCCCD" className="text-sm font-medium">
            Xác nhận số CCCD <span className="text-red-500">*</span>
          </Label>
          <Input
            id="confirmCCCD"
            type="text"
            placeholder="Nhập lại 12 chữ số CCCD để xác nhận"
            value={confirmCCCD}
            onChange={handleConfirmCCCDChange}
            maxLength={12}
            className="mt-1"
            disabled={isLoading}
          />
          <p className="text-xs text-gray-500 mt-1">
            Đã nhập: {confirmCCCD.length}/12 chữ số
            {confirmCCCD.length > 0 && newCCCD.length > 0 && (
              <span
                className={`ml-2 ${newCCCD === confirmCCCD ? "text-green-600" : "text-red-600"}`}
              >
                {newCCCD === confirmCCCD ? "✓ Khớp" : "✗ Không khớp"}
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <Button
          type="submit"
          disabled={!isFormValid || isLoading}
          className="flex-1"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Đang cập nhật...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Cập nhật CCCD
            </>
          )}
        </Button>
      </div>

      <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
        <strong>Chú ý:</strong> Sau khi cập nhật thành công, nhân viên sẽ cần sử
        dụng số CCCD mới để đăng nhập và tra cứu thông tin lương. Vui lòng thông
        báo cho nhân viên về thay đổi này.
      </div>
    </form>
  );
}
