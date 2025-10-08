"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { formatVietnamTimestamp } from "@/lib/utils/vietnam-timezone";
import {
  PenTool,
  CheckCircle,
  AlertCircle,
  Clock,
  User,
  Calendar,
  FileText,
  Shield,
} from "lucide-react";

interface SignatureFormData {
  salary_month: string;
  signature_type: "giam_doc" | "ke_toan" | "nguoi_lap_bieu";
  notes?: string;
  device_info?: string;
}

interface ManagementSignatureFormProps {
  month: string;
  signatureType: "giam_doc" | "ke_toan" | "nguoi_lap_bieu";
  userInfo: {
    employee_id: string;
    full_name: string;
    department: string;
    role: string;
  };
  isEligible: boolean;
  eligibilityReason?: string;
  existingSignature?: Record<string, unknown>;
  onSubmit: (data: SignatureFormData) => Promise<void>;
  loading?: boolean;
  className?: string;
}

const SIGNATURE_TYPE_LABELS = {
  giam_doc: "Giám Đốc",
  ke_toan: "Kế Toán",
  nguoi_lap_bieu: "Người Lập Biểu",
};

const SIGNATURE_TYPE_DESCRIPTIONS = {
  giam_doc: "Xác nhận tổng thể lương tháng cho toàn bộ công ty",
  ke_toan: "Xác nhận tính chính xác tài chính và tính toán lương",
  nguoi_lap_bieu: "Xác nhận báo cáo và thống kê lương đầy đủ, chính xác",
};

const SIGNATURE_TYPE_COLORS = {
  giam_doc: "bg-blue-50 border-blue-200 text-blue-800",
  ke_toan: "bg-green-50 border-green-200 text-green-800",
  nguoi_lap_bieu: "bg-purple-50 border-purple-200 text-purple-800",
};

export default function ManagementSignatureForm({
  month,
  signatureType,
  userInfo,
  isEligible,
  eligibilityReason,
  existingSignature,
  onSubmit,
  loading = false,
  className = "",
}: ManagementSignatureFormProps) {
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isEligible || existingSignature) return;

    try {
      setIsSubmitting(true);

      const formData: SignatureFormData = {
        salary_month: month,
        signature_type: signatureType,
        notes: notes.trim() || undefined,
        device_info: navigator.userAgent,
      };

      await onSubmit(formData);
    } catch (error) {
      console.error("Error submitting signature:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Use centralized Vietnam timezone formatting
  const formatDateTime = formatVietnamTimestamp;

  return (
    <Card className={`${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PenTool className="h-5 w-5" />
          Ký Xác Nhận {SIGNATURE_TYPE_LABELS[signatureType]}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        <div
          className={`p-4 rounded-lg border ${SIGNATURE_TYPE_COLORS[signatureType]}`}
        >
          <h4 className="font-medium mb-2">Mô tả chức năng:</h4>
          <p className="text-sm">
            {SIGNATURE_TYPE_DESCRIPTIONS[signatureType]}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Tháng lương
            </Label>
            <Input value={month} disabled className="bg-gray-50" />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Loại chữ ký
            </Label>
            <Input
              value={SIGNATURE_TYPE_LABELS[signatureType]}
              disabled
              className="bg-gray-50"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Người ký
            </Label>
            <Input
              value={`${userInfo.full_name} (${userInfo.employee_id})`}
              disabled
              className="bg-gray-50"
            />
          </div>

          <div className="space-y-2">
            <Label>Phòng ban</Label>
            <Input
              value={userInfo.department}
              disabled
              className="bg-gray-50"
            />
          </div>
        </div>

        {existingSignature ? (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <div className="space-y-2">
                <p className="font-medium">✅ Đã ký xác nhận thành công</p>
                <div className="text-sm space-y-1">
                  <p>Người ký: {existingSignature.signed_by_name}</p>
                  <p>
                    Thời gian: {formatDateTime(existingSignature.signed_at)}
                  </p>
                  {existingSignature.notes && (
                    <p>Ghi chú: {existingSignature.notes}</p>
                  )}
                </div>
              </div>
            </AlertDescription>
          </Alert>
        ) : !isEligible ? (
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              <div className="space-y-2">
                <p className="font-medium">⏳ Chưa thể ký xác nhận</p>
                <p className="text-sm">{eligibilityReason}</p>
              </div>
            </AlertDescription>
          </Alert>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="notes" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Ghi chú (tùy chọn)
              </Label>
              <Textarea
                id="notes"
                placeholder={`Nhập ghi chú cho việc ký xác nhận ${SIGNATURE_TYPE_LABELS[signatureType].toLowerCase()}...`}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                maxLength={500}
                className="resize-none"
              />
              <div className="text-right text-sm text-gray-500">
                {notes.length}/500 ký tự
              </div>
            </div>

            <Alert className="border-blue-200 bg-blue-50">
              <Shield className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <div className="space-y-2">
                  <p className="font-medium">Xác nhận trước khi ký:</p>
                  <ul className="text-sm space-y-1 list-disc list-inside">
                    <li>
                      Tôi đã kiểm tra và xác nhận tính chính xác của dữ liệu
                      lương tháng {month}
                    </li>
                    <li>
                      Tôi hiểu rằng chữ ký này có giá trị pháp lý và không thể
                      hoàn tác
                    </li>
                    <li>
                      Tôi có đầy đủ thẩm quyền để thực hiện việc ký xác nhận này
                    </li>
                  </ul>
                </div>
              </AlertDescription>
            </Alert>

            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting || loading}
              size="lg"
            >
              {isSubmitting || loading ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                <>
                  <PenTool className="h-4 w-4 mr-2" />
                  Ký Xác Nhận {SIGNATURE_TYPE_LABELS[signatureType]}
                </>
              )}
            </Button>
          </form>
        )}

        <div className="pt-4 border-t">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Thời gian hiện tại:</span>
            <Badge variant="outline">
              {new Date().toLocaleString("vi-VN")}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
